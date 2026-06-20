import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getBillingStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    const [{ data: profile }, { data: lastSuccess }, { data: recent }] = await Promise.all([
      supabase.from("profiles").select("email, full_name, plan, updated_at").eq("id", userId).maybeSingle(),
      supabase
        .from("payment_events")
        .select("id, payment_status, amount_gross, currency, item_name, pf_payment_id, created_at")
        .eq("user_id", userId)
        .eq("payment_status", "COMPLETE")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("payment_events")
        .select("id, payment_status, amount_gross, currency, item_name, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(10),
    ]);

    return {
      profile: profile ?? null,
      lastSuccess: lastSuccess ?? null,
      recent: recent ?? [],
    };
  });
