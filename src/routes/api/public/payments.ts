import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual, createHash } from "crypto";

const PAYFAST_VALIDATE_URL = "https://www.payfast.co.za/eng/query/validate";

function verifyHmac(secret: string, payload: string, expected: string): boolean {
  try {
    const computed = createHmac("sha256", secret).update(payload).digest("hex");
    return timingSafeEqual(Buffer.from(computed), Buffer.from(expected));
  } catch {
    return false;
  }
}

function verifyStripeSignature(body: string, signature: string | null, secret: string): boolean {
  if (!signature) return false;
  const parts = signature.split(",").reduce((acc, part) => {
    const [key, value] = part.trim().split("=");
    acc[key] = value;
    return acc;
  }, {} as Record<string, string>);
  const timestamp = parts.t;
  const signatureValue = parts.v1;
  if (!timestamp || !signatureValue) return false;
  return verifyHmac(secret, `${timestamp}.${body}`, signatureValue);
}

function verifyPaddleSignature(body: string, signature: string | null, secret: string): boolean {
  if (!signature) return false;
  const parts = signature.split(";").reduce((acc, part) => {
    const [key, value] = part.trim().split("=");
    acc[key] = value;
    return acc;
  }, {} as Record<string, string>);
  const timestamp = parts.ts;
  const signatureValue = parts.h1;
  if (!timestamp || !signatureValue) return false;
  return verifyHmac(secret, `${timestamp}:${body}`, signatureValue);
}

function payfastSignature(data: Record<string, string>, passphrase?: string): string {
  const ordered = Object.keys(data)
    .filter((k) => k !== "signature" && data[k] !== "" && data[k] != null)
    .sort()
    .map((k) => `${k}=${encodeURIComponent(data[k].trim()).replace(/%20/g, "+")}`)
    .join("&");
  const withPass = passphrase
    ? `${ordered}&passphrase=${encodeURIComponent(passphrase.trim()).replace(/%20/g, "+")}`
    : ordered;
  return createHash("md5").update(withPass).digest("hex");
}

async function verifyPayfastItn(data: Record<string, string>, passphrase?: string): Promise<boolean> {
  const expected = payfastSignature(data, passphrase);
  if (data.signature !== expected) return false;
  try {
    const verify = await fetch(PAYFAST_VALIDATE_URL, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams(data),
    });
    const text = await verify.text();
    return text.startsWith("VALID");
  } catch (e) {
    console.error("PayFast ITN validation request failed", e);
    return false;
  }
}

function getProvider(): string {
  return (process.env.PAYMENTS_PROVIDER || "payfast").toLowerCase();
}

async function parseBody(request: Request): Promise<{ json?: any; form?: Record<string, string> }> {
  const contentType = request.headers.get("content-type") || "";
  if (contentType.includes("application/x-www-form-urlencoded") || contentType.includes("multipart/form-data")) {
    const form = await request.formData();
    const record: Record<string, string> = {};
    form.forEach((value, key) => {
      record[key] = String(value);
    });
    return { form: record };
  }
  const text = await request.text();
  try {
    return { json: JSON.parse(text) };
  } catch {
    return { form: Object.fromEntries(new URLSearchParams(text)) };
  }
}

function getCustomerEmail(provider: string, payload: any): string | null {
  if (provider === "payfast") {
    return payload?.email_address || null;
  }
  if (provider === "stripe") {
    const obj = payload?.data?.object || payload;
    return obj?.customer_email || obj?.customer_details?.email || null;
  }
  // Paddle
  const data = payload?.data || payload;
  return data?.customer?.email || data?.customer_email || null;
}

function getPaidPlan(provider: string, payload: any): "premium" | "free" | null {
  if (provider === "payfast") {
    const status = payload?.payment_status;
    return status === "COMPLETE" ? "premium" : status === "CANCELLED" ? "free" : null;
  }
  if (provider === "stripe") {
    const eventType = payload?.type;
    if (eventType === "checkout.session.completed" || eventType === "invoice.payment_succeeded") return "premium";
    if (eventType === "customer.subscription.deleted") return "free";
    return null;
  }
  // Paddle
  const eventType = payload?.event_type;
  if (eventType === "subscription.activated" || eventType === "subscription.updated" || eventType === "transaction.completed") return "premium";
  if (eventType === "subscription.canceled" || eventType === "subscription.past_due") return "free";
  return null;
}

export const Route = createFileRoute("/api/public/payments")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const provider = getProvider();
        const body = await parseBody(request);

        if (provider === "payfast") {
          const data = body.form || {};
          const passphrase = process.env.PAYFAST_PASSPHRASE || undefined;
          const valid = await verifyPayfastItn(data, passphrase);
          if (!valid) {
            return new Response("Invalid PayFast ITN", { status: 400 });
          }
          const email = data.email_address;
          const newPlan = data.payment_status === "COMPLETE" ? "premium" : data.payment_status === "CANCELLED" ? "free" : null;
          if (!email || !newPlan) {
            return new Response("OK", { status: 200 });
          }
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { error } = await supabaseAdmin
            .from("profiles")
            .update({ plan: newPlan, updated_at: new Date().toISOString() })
            .eq("email", email);
          if (error) {
            console.error("PayFast ITN profile update failed", error);
            return new Response("OK", { status: 200 });
          }
          return new Response("OK", { status: 200 });
        }

        // Stripe / Paddle JSON flow
        const payload = body.json;
        if (!payload) {
          return new Response("Invalid JSON", { status: 400 });
        }
        const secret = process.env.PAYMENT_WEBHOOK_SECRET;
        if (secret) {
          const signatureHeader = provider === "stripe" ? "stripe-signature" : "paddle-signature";
          const signature = request.headers.get(signatureHeader);
          const valid =
            provider === "stripe"
              ? verifyStripeSignature(JSON.stringify(payload), signature, secret)
              : verifyPaddleSignature(JSON.stringify(payload), signature, secret);
          if (!valid) {
            return new Response("Invalid signature", { status: 401 });
          }
        }

        const email = getCustomerEmail(provider, payload);
        if (!email) {
          return new Response("No customer email in payload", { status: 400 });
        }

        const newPlan = getPaidPlan(provider, payload);
        if (!newPlan) {
          return new Response("Ignored", { status: 200 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { error } = await supabaseAdmin
          .from("profiles")
          .update({ plan: newPlan, updated_at: new Date().toISOString() })
          .eq("email", email);

        if (error) {
          console.error("Webhook profile update failed", error);
          return new Response("Failed to update profile", { status: 500 });
        }

        return new Response("ok", { status: 200 });
      },
    },
  },
});
