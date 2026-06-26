# Native IAP for Premium (iOS + Android)

Apple and Google both require in-app purchases for digital subscriptions inside their apps. The current PayFast web flow stays for the website; inside the native app we'll use native IAP instead.

## What I'll build

### 1. Native IAP plugin
- Add `@capacitor-community/in-app-purchases` (or RevenueCat — see Open Question).
- Configure product IDs:
  - `nextcareer_premium_monthly`
  - `nextcareer_premium_yearly`

### 2. Platform-aware upgrade page (`src/routes/_authenticated.upgrade.tsx`)
- On **web**: keep the existing PayFast "Pay Now" form.
- On **native** (iOS/Android): show native IAP buttons that trigger the store purchase sheet.
- Use existing `isNativePlatform()` helper from `src/lib/platform.ts`.

### 3. Receipt verification backend
- New server route `src/routes/api/public/iap-verify.ts`:
  - Accepts `{ platform, receipt, productId, userId }` from the app after purchase.
  - **iOS**: verifies receipt with Apple's `verifyReceipt` endpoint using a shared secret.
  - **Android**: verifies via Google Play Developer API using a service account key.
  - On valid receipt → upgrades profile to `premium` (via `supabaseAdmin`).
  - Logs to `payment_events` table (reuse existing).

### 4. Restore Purchases
- Add a "Restore Purchases" button on the upgrade screen (required by Apple).
- Calls plugin's restore method, re-verifies any active receipts, re-upgrades plan if needed.

### 5. Subscription status sync
- On app launch (native only), check current entitlement and reconcile with `profiles.plan`.

### 6. Remove Google sign-in todo
- No deep-link OAuth work — email/password only inside the native app.

## Secrets you'll need to add later
- `APPLE_SHARED_SECRET` — from App Store Connect, after creating the subscription product.
- `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` — from Google Play Console, after creating the subscription product.

I'll request these via the secret tool when we get to that step. They aren't needed to write the code.

## What you'll do outside the editor (later, when submitting)
1. Create the subscription products in App Store Connect and Google Play Console with the exact product IDs above.
2. Set pricing tiers per region.
3. Provide the two secrets above.
4. For Apple: paste the privacy policy URL (already at `/privacy`) and EULA.

## Open question
**Do you want to use RevenueCat (recommended) or raw native IAP?**
- **RevenueCat**: handles receipt verification, restore, entitlements, analytics, cross-platform syncing automatically. Free up to $2.5K/mo revenue, then 1%. Much less code, much fewer edge cases.
- **Raw IAP**: no third party, no fee, but you maintain receipt verification, renewal handling, grace periods, refunds, server-side validation yourself.

If you don't have a preference, I'll go with **RevenueCat** — it's the standard for indie apps and avoids most of the headaches that get apps rejected on first submission.