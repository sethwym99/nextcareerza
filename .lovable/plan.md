## Fix Codemagic build (Sync Capacitor Android failure)

**Root cause:** Capacitor's `webDir` is `dist`, but Vite/TanStack Start writes the client bundle to `dist/client/` and the server bundle to `dist/server/`. Capacitor sync aborts with "Could not find the web assets directory: ./dist".

**Bigger issue:** NextCareer is an SSR app — server functions (`*.functions.ts`), the AI gateway, transcription, billing webhooks, email queue, etc. only exist on the Lovable Cloud server. A pure static `dist/client/` bundle inside an APK would render the shell but every server call would fail.

### Recommended approach: thin native shell

Point the Android app at your published Lovable URL. The APK becomes a native wrapper (with Google Play Billing wired natively through `cordova-plugin-purchase`) while all SSR/server-function logic keeps running on Lovable Cloud where it already works.

### Changes

1. **`capacitor.config.ts`**
   - Set `webDir: "dist/client"` so `cap sync` finds the static fallback.
   - Add `server: { url: "https://nextcareer.one", cleartext: false }` so the WebView loads the live site (server functions, auth callbacks, payments, AI all work).

2. **`codemagic.yaml`** — no change needed; the existing `bun run build` → `npx cap sync android` → `gradlew bundleRelease` sequence will work once `webDir` is correct.

### Why not bundle everything locally

- Server functions are compiled into `dist/server/_worker.js` (Cloudflare Worker) — they cannot run inside an Android WebView.
- Rewriting every server function as a client-side call would re-expose service-role keys and break auth.
- The thin-shell approach is what RevenueCat/Capacitor billing docs recommend for SSR apps and is the only path that keeps Google Play Billing native while preserving the working backend.

### After this lands

Re-run the Codemagic build. The `.aab` will install, open the live NextCareer site inside the native shell, and `cordova-plugin-purchase` will hand off to Google Play for subscriptions exactly as wired in `src/lib/play-billing.ts`.