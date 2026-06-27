# RevenueCat Setup Guide

You already have the code wired up (`src/lib/iap.ts`, `src/routes/_authenticated.upgrade.tsx`, `src/routes/api/public/revenuecat.ts`). What's left is configuration in the RevenueCat dashboard and pasting two keys into the project. No code changes needed yet — those come once you have Apple/Google developer accounts.

## What you'll do in RevenueCat (no dev accounts needed yet)

1. **Create a free RevenueCat account** at revenuecat.com
2. **Create a project** called "NextCareer"
3. **Create an Entitlement** named exactly `premium` (this is what the code checks for)
4. **Create an Offering** named `default` with one package: monthly Premium at R99/mo
5. **Get your two public API keys** (Project Settings → API Keys):
   - Apple App Store key (starts with `appl_`)
   - Google Play Store key (starts with `goog_`)
6. **Configure the webhook** (Project Settings → Integrations → Webhooks):
   - URL: `https://nextcareer.one/api/public/revenuecat`
   - Authorization header: `Bearer <REVENUECAT_WEBHOOK_AUTH value>` (already stored as a secret in your project)

## What I'll do once you send the keys

- Add `VITE_REVENUECAT_IOS_KEY` and `VITE_REVENUECAT_ANDROID_KEY` to env so the native app can load offerings
- Verify the webhook handler matches RevenueCat's payload shape
- Test the upgrade screen renders the package once keys are in

## What requires the developer accounts (later, not now)

- Creating the actual subscription products in App Store Connect + Google Play Console
- Linking those products to the RevenueCat Offering
- Testing real purchases in sandbox

Until you have those, RevenueCat will show "no offerings available" in the native app — that's expected. The web PayFast flow keeps working in the meantime.

## What I need from you next

- Confirm the entitlement name `premium` and offering name `default` work for you (or tell me what you'd prefer)
- Once you've made the RevenueCat account, paste the two public API keys here
