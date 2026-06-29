/**
 * Google Play Billing wrapper via cordova-plugin-purchase (Capacitor-compatible).
 * Web is a no-op — the web Upgrade flow uses PayFast instead.
 *
 * Backend verification happens through verifyPlayPurchase() in
 * src/lib/play-billing.functions.ts. We do NOT trust the client; the server
 * calls the Google Play Developer API before flipping profiles.plan.
 */
import { isNativeApp, nativePlatform } from "@/lib/platform";
import { verifyPlayPurchase } from "@/lib/play-billing.functions";

export const PRODUCT_IDS = {
  monthly: "nextcareer_premium_monthly",
  yearly: "nextcareer_premium_yearly",
  lifetime: "nextcareer_premium_lifetime",
} as const;

export type PlayProduct = {
  id: string;
  title: string;
  description: string;
  priceString: string;
  kind: "subscription" | "lifetime";
};

let initialized = false;
let storeRef: any = null;
let lastVerify: any = null;

async function getStore() {
  // Loaded dynamically; the module references cordova globals that don't exist on web.
  const mod: any = await import("cordova-plugin-purchase");
  const CdvPurchase = mod.CdvPurchase ?? (mod.default && mod.default.CdvPurchase) ?? mod;
  return CdvPurchase;
}

export async function initBilling(): Promise<void> {
  if (!isNativeApp() || nativePlatform() !== "android") return;
  if (initialized) return;

  const CdvPurchase = await getStore();
  const store = CdvPurchase.store;
  storeRef = store;

  // Register products
  store.register([
    {
      id: PRODUCT_IDS.monthly,
      type: CdvPurchase.ProductType.PAID_SUBSCRIPTION,
      platform: CdvPurchase.Platform.GOOGLE_PLAY,
    },
    {
      id: PRODUCT_IDS.yearly,
      type: CdvPurchase.ProductType.PAID_SUBSCRIPTION,
      platform: CdvPurchase.Platform.GOOGLE_PLAY,
    },
    {
      id: PRODUCT_IDS.lifetime,
      type: CdvPurchase.ProductType.NON_CONSUMABLE,
      platform: CdvPurchase.Platform.GOOGLE_PLAY,
    },
  ]);

  // Server-side validation via our verifyPlayPurchase server function.
  store.validator = async (receipt: any, callback: (ok: any) => void) => {
    try {
      const productId = receipt?.id ?? receipt?.transaction?.products?.[0]?.id;
      const purchaseToken =
        receipt?.transaction?.purchaseToken ??
        receipt?.purchaseToken ??
        receipt?.nativePurchase?.purchaseToken;
      if (!productId || !purchaseToken) {
        callback({ ok: false, code: 6778003, message: "Missing token" });
        return;
      }
      const res = await verifyPlayPurchase({ data: { productId, purchaseToken } });
      lastVerify = res;
      if (res?.ok) {
        callback({ ok: true, data: { id: productId, transaction: receipt.transaction } });
      } else {
        callback({ ok: false, code: 6778003, message: res?.error || "Verification failed" });
      }
    } catch (e: any) {
      lastVerify = { ok: false, error: String(e?.message || e) };
      callback({ ok: false, code: 6778003, message: e?.message || "Verification error" });
    }
  };

  // Finish on verified.
  store.when().approved((p: any) => p.verify());
  store.when().verified((receipt: any) => receipt.finish());
  store.error((err: any) => {
    console.warn("[play-billing] error", err);
  });

  await store.initialize([CdvPurchase.Platform.GOOGLE_PLAY]);
  initialized = true;
}

export async function getOfferings(): Promise<PlayProduct[]> {
  if (!isNativeApp() || nativePlatform() !== "android") return [];
  if (!initialized) await initBilling();
  if (!storeRef) return [];
  const products: any[] = storeRef.products ?? [];
  return products
    .filter((p) => Object.values(PRODUCT_IDS).includes(p.id))
    .map((p) => {
      const offer = p.offers?.[0];
      const pricing = offer?.pricingPhases?.[0];
      return {
        id: p.id,
        title: p.title ?? p.id,
        description: p.description ?? "",
        priceString: pricing?.price ?? offer?.price ?? "—",
        kind: p.id === PRODUCT_IDS.lifetime ? "lifetime" : "subscription",
      } satisfies PlayProduct;
    });
}

export async function purchase(productId: string): Promise<boolean> {
  if (!storeRef) await initBilling();
  if (!storeRef) return false;
  const product = storeRef.get(productId);
  if (!product) throw new Error("Product not available");
  const offer = product.getOffer();
  if (!offer) throw new Error("No offer available");
  await offer.order();
  return true;
}

export async function restore(): Promise<void> {
  if (!storeRef) await initBilling();
  if (!storeRef) return;
  await storeRef.restorePurchases();
}

export function getBillingStatus() {
  return {
    platform: nativePlatform(),
    initialized,
    productCount: storeRef?.products?.length ?? 0,
    lastVerify,
  };
}
