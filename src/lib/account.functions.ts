import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Permanently deletes the signed-in user's account and all related data.
 * Required for App Store / Play Store compliance (Apple 5.1.1(v) and Google).
 */
export const deleteAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const userId = context.userId;

    // Best-effort wipe of user-owned rows. RLS scopes these to the user.
    const tables = [
      "application_packs",
      "applications",
      "usage_events",
      "payment_events",
      "profiles",
    ] as const;
    for (const t of tables) {
      try {
        await context.supabase.from(t).delete().eq("user_id", userId);
      } catch (e) {
        console.warn(`[deleteAccount] wipe ${t} failed`, e);
      }
    }
    // profiles uses `id`, not `user_id`
    try {
      await context.supabase.from("profiles").delete().eq("id", userId);
    } catch {}

    // Delete the auth user with the service-role client.
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
      if (error) throw error;
    } catch (e: any) {
      // If admin delete fails, at least the user's data is gone. Surface a soft error.
      console.error("[deleteAccount] auth deletion failed", e);
      return { ok: false, message: "Your data was removed but the auth record could not be deleted. Contact support@nextcareer.one." };
    }

    return { ok: true };
  });
