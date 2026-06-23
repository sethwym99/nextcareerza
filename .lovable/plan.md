# Make NextCareer ready for Play Store & App Store

You'll wrap the existing web app with **Capacitor** (one codebase, two stores), tighten the mobile UX, add push notifications, and ship the legal pages + store assets reviewers require. Below is everything I'd add/improve, grouped so you can approve all or pick parts.

---

## 1. Wrap the app with Capacitor (required for both stores)

Capacitor turns the deployed web app into a real iOS + Android binary you can submit.

- Add Capacitor (`@capacitor/core`, `@capacitor/cli`, `@capacitor/ios`, `@capacitor/android`).
- `capacitor.config.ts` with `appId: "one.nextcareer.app"`, `appName: "NextCareer"`, `webDir: "dist"`, server URL pointing at `https://nextcareer.one` (so the app always serves your latest deploy without re-submitting to stores for every change).
- Generate native iOS (Xcode) + Android (Android Studio) shells.
- Splash screen + adaptive icon configured from `/logo.png`.
- Status bar plugin so the dark theme matches the OS chrome.
- Build docs in `README.md` for how to run `npx cap sync && npx cap open ios|android`.

You'll need a Mac + Apple Developer ($99/yr) and a Play Console account ($25 one-time) to actually submit — I can't do that part from here, but the project will be ready to open in Xcode/Android Studio.

## 2. Mobile-first UI polish

The current layout works on mobile but feels like a desktop site shrunk down. Changes:

- **Bottom tab bar** on mobile (Dashboard, Smart Apply, Tracker, Profile) replacing the hamburger drawer. Drawer stays for "more" items (CV Builder, Cover Letter, Interview, Roadmap).
- **Safe-area insets** (`env(safe-area-inset-*)`) so content doesn't sit under the notch / home indicator.
- **Tap targets** ≥ 44px everywhere, larger buttons in forms.
- **Pull-to-refresh** on Tracker and Dashboard usage cards.
- **Sticky CTA** on Smart Apply ("Generate" button pinned above keyboard).
- **Sheet-style modals** (vaul) instead of centered dialogs on small screens.
- Replace the desktop header on `/dashboard` with a compact mobile app-bar.
- Loading skeletons in place of "Loading…" text.

## 3. Push notifications

Using Capacitor Push Notifications + Firebase Cloud Messaging (free):

- New `device_tokens` table (`user_id`, `token`, `platform`, timestamps) + RLS.
- `registerPushToken` server function called on app launch.
- Server-side trigger points (server function + scheduled cron in Lovable Cloud):
  - **Interview reminder** the day before an interview saved in Tracker.
  - **Follow-up nudge** 7 days after `applied` status with no update.
  - **Monthly usage reset** notification on the 1st.
  - **Smart Apply finished** if user backgrounded the app mid-run.
- In-app **Notification settings** screen so users can toggle categories (Apple requires a clear opt-out).

## 4. Legal & policy pages (Apple/Google will reject without these)

- `/privacy` — privacy policy (covers Lovable Cloud auth, AI processing of CV text via Lovable AI Gateway, payment data via PayFast, push tokens).
- `/terms` — terms of service.
- `/support` — support email + FAQ (Apple requires a working support URL).
- `/delete-account` — in-app account deletion flow (Apple 5.1.1(v) **and** Google now require this; not just "email us"). Wires to a `deleteAccount` server function that purges profile, applications, packs, usage, tokens.
- Link all four from the sidebar footer and landing page footer.

## 5. Subscription / payment compliance

This is the biggest review risk. Right now you charge R99/mo via PayFast (web).

- **iOS app build**: Apple requires StoreKit/IAP for digital subscriptions or they reject. Two safe options:
  1. **Reader-app pattern**: hide the "Subscribe" button inside the iOS build, let users sign up on the web, and just let them sign in on iOS (cleanest, no IAP integration).
  2. **Add StoreKit IAP** for the iOS build (significant extra work, 30/15% Apple cut). I'd recommend option 1 for v1.
- **Android build**: Google Play allows external billing for non-game apps in many regions, but you must add Google Play Billing or use the User Choice Billing program to be safe. Easiest v1: same reader pattern (subscribe on web only).
- Add a clear **"Restore purchases / Refresh subscription"** button on the Billing screen so users can re-sync after subscribing on web.

## 6. Account & auth hardening

- **Sign in with Apple** — Apple requires it on iOS if you offer any other social login. (You currently have email only, so this is only needed once you add Google.) Recommend enabling Apple auth in Lovable Cloud now so it's ready.
- **Forgot password** flow on `/auth` (missing today).
- **Email verification** on signup.
- **Re-auth before account delete**.

## 7. Store assets you'll need ready

- App icon: 1024×1024 (iOS), 512×512 + adaptive (Android). Generate from your existing logo.
- iOS screenshots: 6.7", 6.5", 5.5" iPhone + iPad if you submit for iPad.
- Android screenshots: phone + 7" + 10" tablet, feature graphic 1024×500.
- Short description (80 chars), full description (4000 chars), keywords, category = **Business** or **Productivity**.
- Promo video (optional but boosts conversion).

I can generate the icon set, the feature graphic, and 4–6 framed screenshots in-app.

## 8. App-stability & UX polish (mobile reviewers test for these)

- Global **error boundary** with a "Report problem" button.
- Empty states for Tracker, Smart Apply history, Interview history (currently blank screens).
- **Onboarding** (3 cards on first launch: "Paste CV → Smart Apply → Track").
- "What's new" modal after updates.
- Crash/usage analytics — drop-in via a privacy-friendly provider (Plausible / PostHog) so you can actually debug field issues.

## 9. SEO / web side (since the web app is the source of truth)

- Add `/privacy`, `/terms`, `/support` to `sitemap.xml`.
- Run an SEO scan once content above is in place.

---

## Suggested build order

If you approve, I'd implement in roughly this order so each step ships something usable:

1. Mobile UI polish + bottom tab bar (1 turn)
2. Legal pages + delete-account flow (1 turn)
3. Forgot password + Sign in with Apple wiring (1 turn)
4. Capacitor setup + icons/splash + native projects (1 turn)
5. Push notifications end-to-end (1 turn)
6. Store screenshots + icon generation (1 turn)

## Out of scope for this plan

- Actual store submission (needs your Apple/Google accounts).
- Native StoreKit / Google Play Billing IAP — recommend reader-app pattern for v1.
- LinkedIn/Indeed scraping or browser extension.

---

**Tell me which sections you want and in what order, or just say "do all of it in the suggested order" and I'll start with step 1.**