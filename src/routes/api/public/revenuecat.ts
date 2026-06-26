import { createFileRoute } from "@tanstack/react-router";

/**
 * RevenueCat webhook receiver.
 * Configure in RevenueCat dashboard:
 *   URL:         https://nextcareer.one/api/public/revenuecat
 *   Auth header: Bearer <REVENUECAT_WEBHOOK_AUTH>
 */
export const Route = createFileRoute("/api/public/revenuecat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const expected = process.env.REVENUECAT_WEBHOOK_AUTH;
        if (expected) {
          const auth = request.headers.get("authorization") || "";
          if (auth !== `Bearer ${expected}`) {
            return new Response("Unauthorized", { status: 401 });
          }
        }

        let payload: any;
        try {
          payload = await request.json();
        } catch {
          return new Response("Invalid JSON", { status: 400 });
        }

        const event = payload?.event;
        if (!event) return new Response("No event", { status: 400 });

        const type: string = event.type || "";
        const appUserId: string | null = event.app_user_id || null;
        const entitlementIds: string[] = event.entitlement_ids || [];

        const grants = [
          "INITIAL_PURCHASE",
          "RENEWAL",
          "NON_RENEWING_PURCHASE",
          "UNCANCELLATION",
          "PRODUCT_CHANGE",
        ];
        const revokes = ["CANCELLATION", "EXPIRATION", "SUBSCRIPTION_PAUSED", "BILLING_ISSUE"];

        const isPremiumEvent = entitlementIds.includes("premium") || entitlementIds.length === 0;

        let newPlan: "premium" | "free" | null = null;
        if (grants.includes(type) && isPremiumEvent) newPlan = "premium";
        else if (revokes.includes(type) && isPremiumEvent) newPlan = "free";

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        await supabaseAdmin.from("payment_events").insert({
          user_id: appUserId,
          email: null,
          provider: "revenuecat",
          payment_status: type,
          amount_gross: event.price ?? null,
          currency: event.currency ?? null,
          pf_payment_id: event.transaction_id ?? null,
          m_payment_id: event.original_transaction_id ?? null,
          item_name: event.product_id ?? null,
          raw: payload,
        });

        if (newPlan && appUserId) {
          const { error } = await supabaseAdmin
            .from("profiles")
            .update({ plan: newPlan, updated_at: new Date().toISOString() })
            .eq("id", appUserId);
          if (error) console.error("RevenueCat profile update failed", error);
        }

        return new Response("ok", { status: 200 });
      },
    },
  },
});
