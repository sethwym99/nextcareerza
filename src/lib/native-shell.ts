/**
 * One-time native shell initialization: status bar style, splash hide, and
 * Android hardware-back handling. No-op on the web.
 */
import { isNativeApp, nativePlatform } from "@/lib/platform";

let initialized = false;

export async function initNativeShell(router: {
  history: { canGoBack: () => boolean; back: () => void };
}) {
  if (initialized || !isNativeApp()) return;
  initialized = true;

  try {
    const { StatusBar, Style } = await import("@capacitor/status-bar");
    await StatusBar.setStyle({ style: Style.Dark });
    if (nativePlatform() === "android") {
      await StatusBar.setBackgroundColor({ color: "#0b0717" });
    }
  } catch (e) {
    console.warn("StatusBar init failed", e);
  }

  try {
    const { SplashScreen } = await import("@capacitor/splash-screen");
    await SplashScreen.hide();
  } catch (e) {
    console.warn("SplashScreen hide failed", e);
  }

  try {
    const { App } = await import("@capacitor/app");
    App.addListener("backButton", () => {
      if (router.history.canGoBack()) {
        router.history.back();
      } else {
        App.exitApp();
      }
    });
  } catch (e) {
    console.warn("BackButton init failed", e);
  }

  try {
    if (nativePlatform() === "android") {
      const { initBilling } = await import("@/lib/play-billing");
      await initBilling();
    }
  } catch (e) {
    console.warn("Play Billing init failed", e);
  }
}
