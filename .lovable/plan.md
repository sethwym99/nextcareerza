
# Ship NextCareer to Google Play (Internal Testing)

Goal: get a working `.aab` uploaded to Internal testing so you can create the subscription/one-time products in Play Console.

I'll handle everything inside the repo. The native Android build and the Play Console clicks have to run on **your** machine — I'll give exact commands and screens to click.

---

## Part A — What I'll do in the repo

1. **Verify/fix Capacitor config** (`capacitor.config.ts`)
   - `appId: one.nextcareer.app` (reverse-DNS, must match Play Console)
   - `appName: NextCareer`, `webDir: dist`, `server.androidScheme: https`

2. **Make sure the Android project exists**
   - If `android/` is missing, add `@capacitor/android` and scaffold it.
   - Add `scripts/sync-android.sh` so future syncs are one command.

3. **Wire Google Play Billing into the Android project**
   - Add `com.android.billingclient:billing:7.x` to `android/app/build.gradle`.
   - Add `<uses-permission android:name="com.android.vending.BILLING" />` to `AndroidManifest.xml`.
   - Confirm `applicationId`, `versionCode=1`, `versionName="1.0.0"`, `minSdk=23`, `targetSdk=34`.
   - Existing `src/lib/play-billing.ts` already uses the Capacitor community plugin — I'll confirm it's installed and registered.

4. **Sanity-check `WebOnly`** so web-only UI stays hidden in the app.

5. **Add `BUILD_ANDROID.md`** with exact Part B commands + Part C checklist.

I will **not** try to run gradle or build the `.aab` from this sandbox — Android SDK + JDK aren't available here.

---

## Part B — What you'll run locally (~30 min)

Prereqs: **Android Studio** (installs JDK 17 + Android SDK) and Node 20+/bun.

```bash
git pull
bun install
bun run build
bunx cap sync android
bunx cap open android
```

In Android Studio:

```text
Build → Generate Signed App Bundle / APK
  → Android App Bundle
  → Create new keystore  (SAVE the .jks file + passwords — losing them = losing the app forever)
  → Release → Finish
```

Output: `android/app/release/app-release.aab`

---

## Part C — Play Console (Internal testing → Products)

1. **Create app** — Name: NextCareer, English, App, Free.
2. **App content** — privacy policy URL `https://nextcareer.one/privacy`, data safety, content rating, target audience, ads = no.
3. **Test and release → Testing → Internal testing → Create new release**
   - Upload `app-release.aab`
   - Release notes: "Initial internal build"
   - Save → Review → Start rollout
   - Add yourself as tester (`socool9123@gmail.com`)
4. Wait 5–15 min for Google to process.
5. **Monetise with Play → Subscriptions** → create:
   - `nextcareer_premium_monthly` (monthly auto-renew base plan)
   - `nextcareer_premium_yearly` (yearly auto-renew base plan)
6. **Monetise with Play → In-app products** → create:
   - `nextcareer_premium_lifetime` (managed product)
7. Activate each product.

---

## Part D — After products exist (next chat)

- Add Google Cloud service-account JSON as secret for server-side purchase verification.
- Subscribe `play-rtdn` Pub/Sub topic to our existing webhook.
- Test a sandbox purchase from Internal testing.

---

Approve this and I'll switch to build mode and do Part A. Then run Part B and ping me when the `.aab` uploads — I'll walk you through Part C live.
