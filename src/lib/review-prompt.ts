/**
 * Native in-app review prompt (Google Play / App Store).
 * No-op on web. Throttled so we don't annoy users.
 */
import { isNativeApp, nativePlatform } from "@/lib/platform";

const LAST_PROMPT_KEY = "nc-review-prompted-at";
const MIN_DAYS_BETWEEN_PROMPTS = 30;

function daysSince(ts: number) {
  return (Date.now() - ts) / (1000 * 60 * 60 * 24);
}

function shouldPrompt(): boolean {
  if (typeof window === "undefined") return false;
  if (!isNativeApp()) return false;
  const last = Number(window.localStorage.getItem(LAST_PROMPT_KEY));
  if (last && daysSince(last) < MIN_DAYS_BETWEEN_PROMPTS) return false;
  return true;
}

function markPrompted() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LAST_PROMPT_KEY, String(Date.now()));
  } catch {
    /* ignore */
  }
}

/**
 * Request a native in-app review if on Android/iOS and not recently prompted.
 * Safe to call from anywhere; resolves to true if the native flow was attempted.
 */
export async function requestInAppReview(): Promise<boolean> {
  if (!shouldPrompt()) return false;

  const platform = nativePlatform();
  if (platform === "web") return false;

  try {
    // cordova-plugin-inapp-review exposes a global InAppReview object.
    const review = (window as any).InAppReview;
    if (!review || typeof review.RequestReview !== "function") {
      // Fallback: open the store listing (less ideal but works).
      const url = platform === "ios"
        ? "https://apps.apple.com/app/idYOUR_APP_ID"
        : "https://play.google.com/store/apps/details?id=com.smforge.nextcareer";
      window.open(url, "_system");
      markPrompted();
      return true;
    }

    await new Promise<void>((resolve, reject) => {
      review.RequestReview(
        () => resolve(),
        (err: any) => reject(err instanceof Error ? err : new Error(String(err))),
      );
    });
    markPrompted();
    return true;
  } catch (e) {
    console.warn("In-app review failed", e);
    return false;
  }
}
