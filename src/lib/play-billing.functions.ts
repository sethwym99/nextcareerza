import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const VerifyInput = z.object({
  productId: z.string().min(1),
  purchaseToken: z.string().min(1),
});

export const verifyPlayPurchase = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => VerifyInput.parse(data))
  .handler(async ({ data, context }) => {
    const { verifyAndApply } = await import("./play-billing.server");
    return verifyAndApply({
      userId: context.userId,
      productId: data.productId,
      purchaseToken: data.purchaseToken,
    });
  });
