## Goal

Remove RevenueCat entirely and wire native Android subscriptions through the `cordova-plugin-purchase` Capacitor wrapper, with backend verification + Real-Time Developer Notifications (RTDN) handled on Lovable Cloud. Web billing (PayFast) is unchanged.

## 1. Rip out RevenueCat

- Uninstall `@revenuecat/purchases-capacitor`.
- Delete:
  - `src/lib/iap.ts` (RevenueCat init + helpers)
  - `src/routes/api/public/revenuecat.ts` (webhook)
  - RevenueCat init call in `src/lib/native-shell.ts`
- Strip RevenueCat references from `src/routes/_authenticated.upgrade.tsx` (debug panel, package mapping, setup instructions).
- Delete secrets: `REVENUECAT_WEBHOOK_AUTH`, `VITE_REVENUECAT_ANDROID_KEY` (if present).

## 2. Install Play Billing plugin

- `bun add cordova-plugin-purchase` (works through Capacitor; ships TypeScript types as `CdvPurchase`).
- Add it to `capacitor.config.ts` cordova plugin list if needed.

## 3. New client wrapper: `src/lib/play-billing.ts`

- `initBilling()` — register the three product IDs (`nextcareer_premium_monthly`, `nextcareer_premium_yearly`, `nextcareer_premium_lifetime`), set validator to call our backend, call `store.initialize([Platform.GOOGLE_PLAY])`.
- `getOfferings()` — return loaded products with localized price strings for the upgrade page.
- `purchase(productId)` — call `product.getOffer().order()`.
- `restore()` — `store.restorePurchases()`.
- Approved → backend verify → finish handler. Verified events update local profile cache.
- Init is called from `src/lib/native-shell.ts` on Android only.

## 4. Backend verification (Lovable Cloud)

### Secrets to add (via `add_secret`, requested from user)
- `GOOGLE_PLAY_PACKAGE_NAME` — e.g. `one.nextcareer.app`
- `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` — full JSON for a GCP service account with Android Publisher access
- `GOOGLE_PLAY_RTDN_TOKEN` — random shared secret we generate and add to the Pub/Sub push URL as `?token=...`

### New server function: `src/lib/play-billing.functions.ts`
- `verifyPlayPurchase({ productId, purchaseToken })` — protected by `requireSupabaseAuth`.
  - Mints a Google OAuth2 access token from the service account JSON (JWT → token endpoint, no SDK; works in Workers).
  - Calls `androidpublisher.purchases.subscriptionsv2.get` (or `products.get` for lifetime) with `packageName` + `purchaseToken`.
  - On valid + active: upsert into new `play_purchases` table (purchase_token PK, user_id, product_id, expiry, state, raw JSON), set `profiles.plan = 'premium'`, set `premium_expires_at`.
  - Returns `{ ok: true, expiresAt }` so the client can finish the transaction.

### New public route: `src/routes/api/public/play-rtdn.ts`
- Validates `?token=` against `GOOGLE_PLAY_RTDN_TOKEN`.
- Decodes Pub/Sub envelope (`message.data` base64 → JSON `DeveloperNotification`).
- Re-fetches the subscription state from Google and updates `play_purchases` + `profiles.plan` accordingly (renewals, cancellations, expirations, refunds, grace period, holds).
- Returns 204.

### New migration
- `play_purchases` table + RLS (user can SELECT own rows; only service role writes).
- GRANTs per project conventions.
- Add `premium_expires_at timestamptz` to `profiles` if not present.
- Update existing `prevent_plan_self_update` trigger to still allow service-role writes (already the case).

## 5. Upgrade page rework (`src/routes/_authenticated.upgrade.tsx`)

- Native Android: list products from `play-billing.ts` with real localized prices, three buttons (Monthly / Yearly / Lifetime) + Restore.
- Native iOS: show "Coming soon on iOS" placeholder (until you do App Store later).
- Web: unchanged PayFast form.
- Replace RevenueCat debug panel with a Play Billing debug panel (dev only): plugin ready state, loaded products, last verification response.

## 6. What the user does outside the app

Documented in chat after build:
1. Google Play Console → create app, complete Payments profile, copy Licensing key (informational, not needed for server-side verification).
2. Create the three subscription/in-app products with the exact IDs above.
3. Google Cloud Console → create service account → grant "Service Account User", then in Play Console → Users and permissions → invite the service account email with "View financial data" + "Manage orders and subscriptions". Download JSON key → paste when prompted.
4. Set Pub/Sub topic for RTDN, point push subscription at `https://nextcareerza.lovable.app/api/public/play-rtdn?token=<GOOGLE_PLAY_RTDN_TOKEN>`. Paste topic name into Play Console → Monetisation setup.
5. Add package name when prompted.

## 7. Verification

- `bun run build` passes (types + Vite).
- Upgrade page renders the PayFast form on web with no RevenueCat imports.
- `rg -i revenuecat` returns nothing.
- Server-function logs show a 401 on `play-rtdn` without the token and 204 with it.

## Technical notes

- Service-account JWT signing uses Web Crypto `SubtleCrypto.importKey` + `sign` with RS256 (Worker-safe; no `jsonwebtoken` package).
- All Google API calls are plain `fetch` — no `googleapis` SDK (Node-only).
- `cordova-plugin-purchase` v13 exposes a tree-shakable ESM `CdvPurchase` namespace; safe to import in a file that is only loaded on native via `platform.ts` guard.
- `supabaseAdmin` is imported inside handlers only (route + server fn), per project rules.
