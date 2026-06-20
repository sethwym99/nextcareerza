import { createServerFn } from "@tanstack/react-start";
import { createHash } from "crypto";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getRequestHost } from "@tanstack/react-start/server";

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

export const createPayfastCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const merchantId = process.env.PAYFAST_MERCHANT_ID;
    const merchantKey = process.env.PAYFAST_MERCHANT_KEY;
    const passphrase = process.env.PAYFAST_PASSPHRASE || undefined;
    const sandbox = (process.env.PAYFAST_SANDBOX || "false").toLowerCase() === "true";

    if (!merchantId || !merchantKey) {
      throw new Error("PayFast merchant credentials are not configured");
    }

    const { data: profile } = await context.supabase
      .from("profiles")
      .select("email, full_name")
      .eq("id", context.userId)
      .maybeSingle();

    const host = getRequestHost();
    const proto = host.includes("localhost") ? "http" : "https";
    const origin = `${proto}://${host}`;

    const fields: Record<string, string> = {
      merchant_id: merchantId,
      merchant_key: merchantKey,
      return_url: `${origin}/dashboard?payment=success`,
      cancel_url: `${origin}/dashboard?payment=cancelled`,
      notify_url: `${origin}/api/public/payments`,
      name_first: (profile?.full_name || "").split(" ")[0] || "Customer",
      email_address: profile?.email || "",
      m_payment_id: `${context.userId}-${Date.now()}`,
      amount: "99.00",
      item_name: "NextHire Premium (monthly)",
      item_description: "Unlimited CV reviews, interviews, cover letters",
      custom_str1: context.userId,
    };

    fields.signature = payfastSignature(fields, passphrase);

    const action = sandbox
      ? "https://sandbox.payfast.co.za/eng/process"
      : "https://www.payfast.co.za/eng/process";

    return { action, fields };
  });
