import { isNativeApp, nativePlatform } from "@/lib/native-helpers";

type PermissionState = "granted" | "denied" | "prompt";

interface CordovaPermissionResult {
  hasPermission: boolean;
  requestResults?: Record<string, "GRANTED" | "DENIED">;
}

interface CordovaPermissionsPlugin {
  checkPermission(
    permission: string,
    success: (result: CordovaPermissionResult) => void,
    error: (err: unknown) => void,
  ): void;
  requestPermission(
    permission: string,
    success: (result: CordovaPermissionResult) => void,
    error: (err: unknown) => void,
  ): void;
  requestPermissions(
    permissions: string[],
    success: (result: CordovaPermissionResult) => void,
    error: (err: unknown) => void,
  ): void;
  CAMERA: string;
  RECORD_AUDIO: string;
  MODIFY_AUDIO_SETTINGS: string;
}

function getCordovaPermissions(): CordovaPermissionsPlugin | null {
  const w = window as unknown as {
    plugins?: { permissions?: CordovaPermissionsPlugin };
  };
  return w.plugins?.permissions ?? null;
}

function androidPermissionName(type: "camera" | "microphone"): string {
  const plugin = getCordovaPermissions();
  if (!plugin) return type === "camera" ? "android.permission.CAMERA" : "android.permission.RECORD_AUDIO";
  return type === "camera" ? plugin.CAMERA : plugin.RECORD_AUDIO;
}

async function checkWebPermission(name: "camera" | "microphone"): Promise<PermissionState> {
  if (typeof navigator === "undefined" || !("permissions" in navigator)) return "prompt";
  try {
    const descriptor = name === "camera" ? ({ name: "camera" } as PermissionDescriptor) : ({ name: "microphone" } as PermissionDescriptor);
    const status = await navigator.permissions.query(descriptor);
    return status.state as PermissionState;
  } catch {
    return "prompt";
  }
}

async function requestAndroidPermission(type: "camera" | "microphone"): Promise<PermissionState> {
  const plugin = getCordovaPermissions();
  if (!plugin) {
    // Plugin not loaded yet; fall back to trying getUserMedia.
    return "prompt";
  }
  const permission = androidPermissionName(type);
  return new Promise((resolve) => {
    plugin.requestPermission(
      permission,
      (result) => {
        resolve(result.hasPermission ? "granted" : "denied");
      },
      () => resolve("denied"),
    );
  });
}

export async function requestCameraPermission(): Promise<PermissionState> {
  if (!isNativeApp() || nativePlatform() !== "android") {
    return checkWebPermission("camera");
  }
  return requestAndroidPermission("camera");
}

export async function requestMicrophonePermission(): Promise<PermissionState> {
  if (!isNativeApp() || nativePlatform() !== "android") {
    return checkWebPermission("microphone");
  }
  return requestAndroidPermission("microphone");
}

export async function requestInterviewPermissions(): Promise<{
  camera: PermissionState;
  microphone: PermissionState;
}> {
  const [camera, microphone] = await Promise.all([
    requestCameraPermission(),
    requestMicrophonePermission(),
  ]);
  return { camera, microphone };
}

export function openAppSettings(): void {
  try {
    // Best-effort intent to open the app's system settings page.
    if (typeof window !== "undefined" && "location" in window) {
      window.open("app-settings:");
    }
  } catch {
    // Ignore; user can navigate manually.
  }
}
