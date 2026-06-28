/**
 * Native In-App Purchases via RevenueCat.
 * Web is a no-op — the web Upgrade flow uses PayFast instead.
 */
import { isNativeApp, nativePlatform } from "@/lib/platform";

export const ENTITLEMENT_ID = "premium";
export const MONTHLY_PRODUCT_ID = "nextcareer_premium_monthly";
export const YEARLY_PRODUCT_ID = "nextcareer_premium_yearly";

let configured = false;

async function getPurchases() {
  const mod = await import("@revenuecat/purchases-capacitor");
  return mod.Purchases;
}

export async function configureIAP(userId: string | null): Promise<void> {
  if (!isNativeApp() || configured) return;
  const platform = nativePlatform();
  const apiKey =
    platform === "ios"
      ? import.meta.env.VITE_REVENUECAT_IOS_KEY
      : import.meta.env.VITE_REVENUECAT_ANDROID_KEY;
  if (!apiKey) {
    // Only warn for the current platform so Android-only setups stay clean.
    if (platform !== "web") {
      console.warn("[iap] RevenueCat API key missing for", platform);
    }
    return;
  }
  const Purchases = await getPurchases();
  await Purchases.configure({ apiKey, appUserID: userId ?? undefined });
  configured = true;
}

export function getIAPConfigStatus() {
  const platform = nativePlatform();
  const apiKey =
    platform === "ios"
      ? import.meta.env.VITE_REVENUECAT_IOS_KEY
      : import.meta.env.VITE_REVENUECAT_ANDROID_KEY;
  return { platform, configured, hasKey: Boolean(apiKey) };
}

export async function loadOfferings() {
  if (!isNativeApp()) return null;
  const Purchases = await getPurchases();
  const { current } = await Purchases.getOfferings();
  return current;
}

export async function purchasePackage(pkg: any): Promise<boolean> {
  if (!isNativeApp()) return false;
  const Purchases = await getPurchases();
  const result = await Purchases.purchasePackage({ aPackage: pkg });
  return Boolean(result.customerInfo?.entitlements?.active?.[ENTITLEMENT_ID]);
}

export async function restorePurchases(): Promise<boolean> {
  if (!isNativeApp()) return false;
  const Purchases = await getPurchases();
  const { customerInfo } = await Purchases.restorePurchases();
  return Boolean(customerInfo?.entitlements?.active?.[ENTITLEMENT_ID]);
}

export async function hasActiveEntitlement(): Promise<boolean> {
  if (!isNativeApp()) return false;
  const Purchases = await getPurchases();
  const { customerInfo } = await Purchases.getCustomerInfo();
  return Boolean(customerInfo?.entitlements?.active?.[ENTITLEMENT_ID]);
}
