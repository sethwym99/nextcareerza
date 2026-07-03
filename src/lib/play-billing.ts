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
let initializing: Promise<void> | null = null;
let storeRef: any = null;
let lastVerify: any = null;
let lastError: string | null = null;
let lastEvent: string | null = null;
let initializeErrors: string[] = [];

function describeError(err: any): string {
  if (!err) return "Unknown billing error";
  if (typeof err === "string") return err;
  const code = err.code ? `${err.code}: ` : "";
  return `${code}${err.message || err.error || JSON.stringify(err)}`;
}

function rememberEvent(event: string) {
  lastEvent = `${new Date().toISOString()} ${event}`;
}

function rememberError(err: any) {
  lastError = describeError(err);
  rememberEvent(`Error: ${lastError}`);
  console.warn("[play-billing] error", err);
}

function findStringByKey(value: any, keys: string[], depth = 0): string | null {
  if (!value || depth > 5) return null;
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findStringByKey(item, keys, depth + 1);
      if (found) return found;
    }
    return null;
  }
  if (typeof value !== "object") return null;
  for (const key of keys) {
    const candidate = value[key];
    if (typeof candidate === "string" && candidate.length > 0) return candidate;
  }
  for (const child of Object.values(value)) {
    const found = findStringByKey(child, keys, depth + 1);
    if (found) return found;
  }
  return null;
}

function extractProductId(receipt: any): string | null {
  const direct = findStringByKey(receipt, ["id", "productId", "sku"]);
  if (direct && Object.values(PRODUCT_IDS).includes(direct as any)) return direct;
  const tx = receipt?.transaction ?? receipt?.transactions?.[0] ?? receipt;
  return (
    tx?.products?.find?.((p: any) => Object.values(PRODUCT_IDS).includes(p?.id))?.id ??
    null
  );
}

function extractPurchaseToken(receipt: any): string | null {
  const tx = receipt?.transaction ?? receipt?.transactions?.[0] ?? receipt;
  return (
    receipt?.purchaseToken ??
    tx?.purchaseToken ??
    tx?.nativePurchase?.purchaseToken ??
    tx?.parentReceipt?.purchaseToken ??
    findStringByKey(receipt, ["purchaseToken"])
  );
}

async function waitForStoreReady(store: any, timeoutMs = 5000): Promise<void> {
  if (store?.isReady) return;
  await new Promise<void>((resolve) => {
    let done = false;
    const finish = () => {
      if (!done) {
        done = true;
        resolve();
      }
    };
    try {
      store.ready(finish);
    } catch {
      finish();
    }
    window.setTimeout(finish, timeoutMs);
  });
}

async function getStore() {
  // The package's d.ts isn't a real module; cast to any.
  const mod: any = await import("cordova-plugin-purchase" as any);
  const CdvPurchase = mod.CdvPurchase ?? (mod.default && mod.default.CdvPurchase) ?? mod;
  return CdvPurchase;
}

export async function initBilling(): Promise<void> {
  if (!isNativeApp() || nativePlatform() !== "android") return;
  if (initialized) return;
  if (initializing) return initializing;

  initializing = doInitBilling().finally(() => {
    initializing = null;
  });
  return initializing;
}

async function doInitBilling(): Promise<void> {
  rememberEvent("Initializing Google Play Billing");

  const CdvPurchase = await getStore();
  const store = CdvPurchase.store;
  storeRef = store;
  store.verbosity = import.meta.env.DEV
    ? (CdvPurchase.LogLevel?.DEBUG ?? 4)
    : (CdvPurchase.LogLevel?.WARNING ?? 2);

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
      const productId = extractProductId(receipt);
      const purchaseToken = extractPurchaseToken(receipt);
      if (!productId || !purchaseToken) {
        const missing = `Missing ${!productId ? "product ID" : "purchase token"}`;
        lastVerify = { ok: false, error: missing };
        rememberError(missing);
        callback({ ok: false, code: 6778003, message: missing });
        return;
      }
      rememberEvent(`Verifying ${productId}`);
      const res = await verifyPlayPurchase({ data: { productId, purchaseToken } });
      lastVerify = res;
      if (res?.ok) {
        rememberEvent(`Verified ${productId}`);
        callback({
          ok: true,
          data: {
            id: productId,
            latest_receipt: true,
            transaction: { type: "android-playstore", purchaseToken },
          },
        });
      } else {
        rememberError(res?.error || "Verification failed");
        callback({ ok: false, code: 6778003, message: res?.error || "Verification failed" });
      }
    } catch (e: any) {
      lastVerify = { ok: false, error: String(e?.message || e) };
      rememberError(e);
      callback({ ok: false, code: 6778003, message: e?.message || "Verification error" });
    }
  };

  // Finish on verified.
  store.when().productUpdated((p: any) => rememberEvent(`Product loaded: ${p.id}`));
  store.when().approved((p: any) => {
    rememberEvent(`Purchase approved: ${p?.products?.[0]?.id ?? p?.transactionId ?? "unknown"}`);
    return p.verify();
  });
  store.when().verified((receipt: any) => {
    rememberEvent(`Receipt verified: ${receipt?.id ?? receipt?.transactions?.[0]?.products?.[0]?.id ?? "unknown"}`);
    return receipt.finish();
  });
  store.when().unverified((receipt: any) => rememberError(receipt?.payload?.message || "Receipt verification failed"));
  store.when().pending((p: any) => rememberEvent(`Purchase pending: ${p?.products?.[0]?.id ?? "unknown"}`));
  store.when().finished((p: any) => rememberEvent(`Purchase finished: ${p?.products?.[0]?.id ?? "unknown"}`));
  store.error(rememberError);

  const errors = await store.initialize([CdvPurchase.Platform.GOOGLE_PLAY]);
  initializeErrors = (errors ?? []).map(describeError);
  if (initializeErrors.length > 0) {
    rememberError(initializeErrors.join("; "));
  }
  await waitForStoreReady(store);
  if ((store.products ?? []).length === 0) {
    try {
      await store.update();
      await waitForStoreReady(store, 2000);
    } catch (e) {
      rememberError(e);
    }
  }
  rememberEvent(`Billing initialized with ${(store.products ?? []).length} products`);
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
  if (!product) {
    const message = "Product not available from Google Play. Check that this app was installed from the internal testing track and the product is active.";
    rememberError(message);
    throw new Error(message);
  }
  const offer = product.getOffer();
  if (!offer) {
    const message = "No Google Play offer is available for this product. Check that its base plan is active.";
    rememberError(message);
    throw new Error(message);
  }
  rememberEvent(`Starting order: ${productId}`);
  const result = await offer.order();
  if (result) {
    rememberError(result);
    throw new Error(describeError(result));
  }
  return true;
}

export async function restore(): Promise<void> {
  if (!storeRef) await initBilling();
  if (!storeRef) return;
  rememberEvent("Restoring purchases");
  const result = await storeRef.restorePurchases();
  if (result) {
    rememberError(result);
    throw new Error(describeError(result));
  }
}

export function getBillingStatus() {
  return {
    platform: nativePlatform(),
    initialized,
    ready: Boolean(storeRef?.isReady),
    productCount: storeRef?.products?.length ?? 0,
    registeredProductIds: Object.values(PRODUCT_IDS),
    loadedProductIds: (storeRef?.products ?? []).map((p: any) => p.id),
    initializeErrors,
    lastError,
    lastEvent,
    lastVerify,
  };
}
