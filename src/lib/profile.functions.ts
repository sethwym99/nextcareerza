import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("profiles")
      .select(
        "id, email, full_name, plan, premium_expires_at, base_cv_text, headline, target_role, location_text, links, updated_at",
      )
      .eq("id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return {
      id: data?.id ?? context.userId,
      email: (data as any)?.email ?? "",
      fullName: (data as any)?.full_name ?? "",
      plan: (data as any)?.plan ?? "free",
      premiumExpiresAt: (data as any)?.premium_expires_at ?? null,
      baseCv: (data as any)?.base_cv_text ?? "",
      headline: (data as any)?.headline ?? "",
      targetRole: (data as any)?.target_role ?? "",
      locationText: (data as any)?.location_text ?? "",
      links: (data as any)?.links ?? "",
      updatedAt: (data as any)?.updated_at ?? null,
    };
  });

const profileSchema = z.object({
  fullName: z.string().max(120).optional(),
  headline: z.string().max(160).optional(),
  targetRole: z.string().max(120).optional(),
  locationText: z.string().max(120).optional(),
  links: z.string().max(2000).optional(),
  baseCv: z.string().max(40000).optional(),
});

export const saveProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => profileSchema.parse(d))
  .handler(async ({ data, context }) => {
    const patch: Record<string, unknown> = {};
    if (data.fullName !== undefined) patch.full_name = data.fullName;
    if (data.headline !== undefined) patch.headline = data.headline;
    if (data.targetRole !== undefined) patch.target_role = data.targetRole;
    if (data.locationText !== undefined) patch.location_text = data.locationText;
    if (data.links !== undefined) patch.links = data.links;
    if (data.baseCv !== undefined) patch.base_cv_text = data.baseCv;
    patch.updated_at = new Date().toISOString();

    const { error } = await context.supabase
      .from("profiles")
      .update(patch as any)
      .eq("id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
