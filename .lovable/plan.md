## Root cause (now confirmed by the screenshot)

The debug panel shows:

- Last error: **"Failed to load billing plugin: cordova-plugin-purchase loaded but store is undefined"**

`cordova-plugin-purchase` v13 is a **Cordova plugin**, not a pure ES module. The npm package's ES export only exposes TypeScript types/enums; the actual runtime `store` instance is attached by the native bridge to `window.CdvPurchase` at `deviceready`. Our code in `src/lib/play-billing.ts` `getStore()` currently does:

```ts
const mod: any = await import("cordova-plugin-purchase" as any);
const CdvPurchase = mod.CdvPurchase ?? (mod.default && mod.default.CdvPurchase) ?? mod;
if (!CdvPurchase?.store) throw new Error("...store is undefined");
```

On device the ES import resolves but `store` is undefined because the store lives on `window.CdvPurchase`, populated only after Cordova's `deviceready` event fires. That's why init fails immediately every launch.

## Plan

Small, targeted client-side fix in `src/lib/play-billing.ts` only. No backend, no Capacitor config, no rebuild-config changes (a new Codemagic build IS required since this is native-facing client code, same as before).

### 1. Wait for `deviceready` before touching the store
Add a helper `waitForDeviceReady(timeoutMs = 8000)` that, on Android native, resolves when either:
- `window.CdvPurchase?.store` is already present, or
- `document.addEventListener("deviceready", ...)` fires, or
- the timeout elapses (then we throw a clear "Cordova deviceready never fired — plugin not installed in APK" error, which is a distinct diagnostic).

### 2. Read the store from `window.CdvPurchase` first
Rewrite `getStore()` to:
1. `await waitForDeviceReady()`.
2. Prefer `(window as any).CdvPurchase` (the runtime global set by the native plugin).
3. Fall back to the ES `import("cordova-plugin-purchase")` only for enum constants (`ProductType`, `Platform`, `LogLevel`) if the window global is missing them — but the store itself must come from the window global.
4. If neither exposes a `store`, throw with a message that distinguishes "deviceready fired but no CdvPurchase global" (plugin missing from APK / cap sync didn't pick it up) from "store missing on CdvPurchase" (plugin partially loaded).

### 3. Keep the existing diagnostics
`rememberError` / `rememberEvent` calls stay so the debug panel keeps surfacing the exact failure string. Add a `rememberEvent("deviceready fired")` and `rememberEvent("CdvPurchase global detected")` so the next screenshot pinpoints where we get to.

### Out of scope
- No changes to `capacitor.config.ts`, Gradle files, or `codemagic.yaml`.
- No backend / server-function changes.
- No UI changes in `_authenticated.upgrade.tsx` (the debug panel already surfaces `lastEvent` / `lastError`).

### Verification
Trigger a new Codemagic build, install from internal testing, open Upgrade → Show debug info. Expected next state:
- **Success:** "Billing initialized = Yes", "Products loaded = 3".
- **If still failing:** the new "Last event" will pinpoint whether `deviceready` fired and whether `window.CdvPurchase` was populated, which tells us if the plugin is actually bundled into the APK (next fix would be re-running `npx cap sync android` in Codemagic or verifying the plugin appears in `android/capacitor.settings.gradle`).