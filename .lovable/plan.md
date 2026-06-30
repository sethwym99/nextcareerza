## Objective
Get the built `.aab` uploaded to Google Play Console and ready for internal testing.

## What I will do (code/config)
1. **Update `codemagic.yaml`** to sign the release `.aab` using a keystore reference. Codemagic will look for a keystore you upload in their web UI (I cannot create the keystore itself). The YAML change adds the standard `key.properties` + `jarsigner`/Gradle signing config so the artifact is accepted by Play Console.
2. **Verify product IDs** in `src/lib/play-billing.ts` match exactly what must be created in Play Console (`nextcareer_premium_monthly`, `nextcareer_premium_yearly`, `nextcareer_premium_lifetime`).
3. **Prepare the RTDN/verification checklist** so after the first test purchase you can confirm server-side validation is wired.

## What you must do manually (I cannot do these inside Google Play Console)
1. **Create/upload a signing keystore** in Codemagic (Settings → Code signing → Android keystores) **OR** generate one locally and tell me the alias/password so I can wire it into the YAML.
2. **In Google Play Console**
   - Go to **Test and release → Internal testing → Create new release**
   - Upload the signed `.aab` from Codemagic artifacts
   - Enroll in **Play App Signing** on first upload (Google generates the final signing key)
   - Go to **Monetise with Play → Subscriptions** and create:
     - `nextcareer_premium_monthly`
     - `nextcareer_premium_yearly`
   - Go to **Monetise with Play → One-time products** and create:
     - `nextcareer_premium_lifetime`
   - Go to **Internal testers → Testers** and add `socool9123@gmail.com`
   - Copy the opt-in link, open it on your Android phone, install, and try a test purchase.
3. **After a test purchase succeeds**, come back here so I can wire the **Google Play service-account JSON** for server verification (this makes premium status permanent and secure).

## Open question before I start
Do you already have an Android keystore (.jks), or do you want me to show you the exact command to create one?