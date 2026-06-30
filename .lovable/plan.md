## Plan: After Codemagic Build Succeeds

### Context
Your Codemagic Android build workflow just finished. Now you need to get the artifact into Google Play and verify native billing works end-to-end.

### Step 1: Download the .aab artifact
- Go to your Codemagic build page
- Download the `.aab` file from the Artifacts tab

### Step 2: Upload to Google Play Console
- Go to [play.google.com/console](https://play.google.com/console)
- Navigate to: **NextCareer → Test and release → Testing → Internal testing**
- Create a new release
- Upload the `.aab` file
- Save and start rollout to Internal testing

### Step 3: Create the billing products (if not done yet)
Play Console only lets you create products after a bundle has been uploaded to that app.

**Subscriptions:**
- `nextcareer_premium_monthly` — Monthly auto-renew
- `nextcareer_premium_yearly` — Yearly auto-renew

**One-time product:**
- `nextcareer_premium_lifetime` — Managed product

Activate each product after setting prices.

### Step 4: Add a tester
- In Play Console → Internal testing → Testers
- Create an email list
- Add `socool9123@gmail.com` (or whichever Gmail you use on your phone)
- Copy the opt-in link and open it on your Android phone

### Step 5: Install and test billing
- From the opt-in link, install NextCareer from the Play Store (internal testing version)
- Sign in with an account that is NOT premium (create a test account if needed)
- Go to the Upgrade screen and tap a subscription
- Complete a test purchase (Play test cards don't charge real money)
- Verify premium unlocks in the app

### Step 6: Server verification (Lovable backend)
Once you confirm purchases work in the app, we'll wire the server-side purchase verification with Google Play's API. This requires a Google Cloud service account JSON key, which we'll set as a secret.

---

**What do you want to do first — upload the .aab and create the products, or do you need help with signing/keystore setup first?**
