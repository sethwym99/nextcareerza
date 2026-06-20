import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "crypto";

function verifyHmac(
  secret: string,
  payload: string,
  expected: string
): boolean {
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
  const signedPayload = `${timestamp}.${body}`;
  return verifyHmac(secret, signedPayload, signatureValue);
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
  const signedPayload = `${timestamp}:${body}`;
  return verifyHmac(secret, signedPayload, signatureValue);
}

function getEventEmail(payload: any): string | null {
  const provider = (process.env.PAYMENTS_PROVIDER || "paddle").toLowerCase();
  if (provider === "stripe") {
    const obj = payload?.data?.object || payload;
    return obj?.customer_email || obj?.customer_details?.email || null;
  }
  // Paddle
  const data = payload?.data || payload;
  return data?.customer?.email || data?.customer_email || null;
}

function isPaidEvent(payload: any): boolean {
  const provider = (process.env.PAYMENTS_PROVIDER || "paddle").toLowerCase();
  if (provider === "stripe") {
    const eventType = payload?.type;
    return eventType === "checkout.session.completed" || eventType === "invoice.payment_succeeded";
  }
  // Paddle
  const eventType = payload?.event_type;
  return (
    eventType === "subscription.activated" ||
    eventType === "subscription.updated" ||
    eventType === "transaction.completed"
  );
}

function isCancelledEvent(payload: any): boolean {
  const provider = (process.env.PAYMENTS_PROVIDER || "paddle").toLowerCase();
  if (provider === "stripe") {
    return payload?.type === "customer.subscription.deleted";
  }
  return (
    payload?.event_type === "subscription.canceled" ||
    payload?.event_type === "subscription.past_due"
  );
}

export const Route = createFileRoute("/api/public/payments")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const provider = (process.env.PAYMENTS_PROVIDER || "paddle").toLowerCase();
        const secret = process.env.PAYMENT_WEBHOOK_SECRET;
        const body = await request.text();

        if (secret) {
          const signatureHeader = provider === "stripe" ? "stripe-signature" : "paddle-signature";
          const signature = request.headers.get(signatureHeader);
          const valid =
            provider === "stripe"
              ? verifyStripeSignature(body, signature, secret)
              : verifyPaddleSignature(body, signature, secret);
          if (!valid) {
            return new Response("Invalid signature", { status: 401 });
          }
        }

        let payload: any;
        try {
          payload = JSON.parse(body);
        } catch {
          return new Response("Invalid JSON", { status: 400 });
        }

        const email = getEventEmail(payload);
        if (!email) {
          return new Response("No customer email in payload", { status: 400 });
        }

        const newPlan = isCancelledEvent(payload) ? "free" : isPaidEvent(payload) ? "premium" : null;
        if (!newPlan) {
          return new Response("Ignored", { status: 200 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { error } = await supabaseAdmin
          .from("profiles")
          .update({ plan: newPlan, updated_at: new Date().toISOString() })
          .eq("email", email)
          .single();

        if (error) {
          console.error("Webhook profile update failed", error);
          return new Response("Failed to update profile", { status: 500 });
        }

        return new Response("ok", { status: 200 });
      },
    },
  },
});
