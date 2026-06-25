## Goal

Ship NextCareer Jobs as a real native iOS + Android app (App Store / Play Store), reusing the existing React code via Capacitor — no rewrite. The marketing landing page stays on the **website only**; the installed app boots straight into the authenticated experience.

## Approach: Capacitor wrapper

Capacitor wraps the existing TanStack Start app in a native iOS/Android shell. Same React code, same dashboard, same backend — but installable from the App Store and Play Store, with a real app icon, splash screen, and access to native features (push notifications, haptics, status bar, share sheet, etc.) when needed.

We detect at runtime whether the code is running inside the native app vs the browser, and branch behavior accordingly.

## What changes

### 1. Install + configure Capacitor

- Add `@capacitor/core`, `@capacitor/cli`, `@capacitor/ios`, `@capacitor/android`, `@capacitor/app`, `@capacitor/status-bar`, `@capacitor/splash-screen`, `@capacitor/haptics`.
- Create `capacitor.config.ts` at the project root:
  - `appId: "one.nextcareer.app"`
  - `appName: "NextCareer Jobs"`
  - `webDir: "dist"` (TanStack Start client build output)
  - splash + status bar settings tuned to the dark gradient theme
- Add a tiny helper `src/lib/platform.ts` exporting `isNativeApp()` (wraps `Capacitor.isNativePlatform()`).

### 2. Route behavior depends on platform

The root URL `/` behaves differently depending on where it runs:

- **In the native app** (`isNativeApp()` true): `/` redirects to `/auth` if logged out, or `/dashboard` if logged in. The marketing landing page is never rendered.
- **On the website** (browser): unchanged — anonymous visitors see the marketing landing, logged-in users redirect to `/dashboard` (already done last turn).

Implementation: small guard at the top of `src/routes/index.tsx`. The marketing JSX stays in the file so the website still works; it just never renders in the app.

Also, in the native app, any "Get the app" / "Download" CTAs are hidden (they make no sense once the user is already in the app). Easiest: a `<WebOnly>` wrapper component that returns `null` on native.

### 3. App identity (icon, name, splash)

- App name on the device home screen: **NextCareer Jobs**.
- App icon: existing `public/logo.png` (the new logo from earlier this thread). Capacitor's `@capacitor/assets` tool generates all required iOS + Android icon sizes and splash images from one source PNG.
- Splash screen: dark gradient background matching `--gradient-hero`, centered logo, auto-hides once the React app mounts.

### 4. Native polish (small but high-impact)

- Set status bar to light content on the dark gradient (`StatusBar.setStyle({ style: Style.Light })`).
- Lock orientation to portrait.
- Handle the Android hardware back button: pop the router history; if at root, prompt to exit.
- Disable browser-style overscroll/bounce inside the WebView.
- Tap feedback: light haptic on primary buttons (optional, easy follow-up).

### 5. Auth & deep links

- Supabase OAuth (Google) needs to return to the app, not a browser tab. Configure `redirectTo` to a custom scheme `one.nextcareer.app://auth/callback` when `isNativeApp()`, and register that scheme in iOS `Info.plist` and Android `AndroidManifest.xml`.
- The web auth flow (browser) is unchanged.

### 6. Backend / data

- No schema changes. Same Supabase project, same RLS, same server functions. The native app calls the same hosted backend at `https://nextcareer.one`.
- Server function calls work from the WebView with no extra setup.

## What does NOT change

- Dashboard, tools (Smart Apply, CV Builder, Interview, etc.), billing, paywall: untouched.
- Marketing website at `nextcareer.one`: unchanged, still has "Get the app" CTAs (those now link to the App Store / Play Store listings once published).
- Database, RLS, edge functions, email infra: untouched.

## Files touched

- `package.json` / `bun.lock` — Capacitor deps.
- `capacitor.config.ts` *(new)* — Capacitor config.
- `ios/` and `android/` *(new, generated)* — native project folders. Created by `npx cap add ios` / `npx cap add android` and committed.
- `src/lib/platform.ts` *(new)* — `isNativeApp()` helper.
- `src/components/web-only.tsx` *(new)* — hides marketing CTAs inside the app.
- `src/routes/index.tsx` — add native-app redirect guard; wrap "Get the app" buttons in `<WebOnly>`.
- `src/routes/__root.tsx` — status bar + splash screen init on mount (native only).
- `src/routes/auth.tsx` — switch OAuth `redirectTo` to custom scheme on native.

## What you'll need to do yourself (I can't do these from here)

Building a real native app and getting it on the stores is partly outside the sandbox. I'll set up everything in code; you'll need to:

1. **Apple Developer account** ($99/yr) and **Google Play Developer account** ($25 one-time) — required to publish.
2. Run `npx cap open ios` / `npx cap open android` on your Mac / Android Studio to build the binaries. (iOS builds require macOS + Xcode.)
3. Upload to App Store Connect and Google Play Console, fill in store listings, screenshots, privacy policy URL (we already have `/privacy`).
4. Review process: ~1–3 days (Apple), hours (Google).

If you don't have a Mac, we can use a cloud Mac service (e.g. Codemagic, EAS Build) for the iOS build — happy to wire that up after.

## Out of scope for this plan (easy follow-ups)

- Push notifications (needs Firebase / APNs setup).
- In-app purchases for Premium (App Store / Play Store take 15–30% — currently you use Paddle/Stripe via web; Apple requires IAP for digital subscriptions, so this is a real decision to make before submitting).
- Offline mode.
