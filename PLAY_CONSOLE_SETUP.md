# Google Play Console Setup Checklist

## 1. Create an Android signing keystore

Run this command on your computer (Mac/Linux terminal, or Windows PowerShell with Java installed):

```bash
keytool -genkey -v -keystore nextcareer-upload.keystore -alias nextcareer -keyalg RSA -keysize 2048 -validity 10000
```

When it asks for passwords:
- **Keystore password:** choose a strong password and save it
- **Key password:** you can use the same password as the keystore
- **Name/Organization:** you can enter your own details or just press Enter to accept defaults

This creates a file named `nextcareer-upload.keystore`. **Keep it safe** — you cannot recover it if lost.

## 2. Add the keystore to Codemagic

1. Go to **codemagic.io** → your NextCareer app → **Settings** tab
2. Click **Code signing**
3. Under **Android keystores**, upload `nextcareer-upload.keystore`
4. Set these environment variables in the same workflow:
   - `KEYSTORE_PASSWORD` = the password you chose above
   - `KEY_ALIAS` = `nextcareer`
   - `KEY_PASSWORD` = the key password you chose above
5. Re-run the build — the `.aab` will now be **signed**

## 3. Upload the signed .aab to Google Play Console

1. Go to [play.google.com/console](https://play.google.com/console)
2. Select your NextCareer app
3. Go to **Test and release → Internal testing**
4. Click **Create new release**
5. Upload the signed `.aab` from Codemagic artifacts
6. On first upload, enroll in **Play App Signing** (Google manages the final signing key)
7. Save and publish to internal testing

## 4. Create subscription and product IDs

Go to **Monetise with Play** and create exactly these IDs:

| Type | Product ID |
|------|-----------|
| Subscription | `nextcareer_premium_monthly` |
| Subscription | `nextcareer_premium_yearly` |
| One-time product | `nextcareer_premium_lifetime` |

Names and prices can be whatever you want, but the **Product ID must match exactly**.

## 5. Add internal testers

1. In Play Console, go to **Internal testing → Testers**
2. Create a testers list if you don't have one
3. Add `socool9123@gmail.com`
4. Copy the **Opt-in URL** and open it on your Android phone
5. Install the app and sign in

## 6. Test a purchase

1. Open the NextCareer app on your phone
2. Go to the **Upgrade** screen
3. Choose a plan and purchase
4. You should see a Google Play test purchase dialog (you won't be charged in internal testing)

## 7. Wire server verification (come back here after test purchase)

After confirming a test purchase works, you need a **Google Cloud service account** so the backend can verify purchases with Google.

Steps to create it:
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select or create a project linked to your Play Console app
3. Go to **IAM & Admin → Service accounts**
4. Click **Create service account**
5. Name it `nextcareer-play-api`
6. Grant it the role **Pub/Sub Publisher** (for RTDN) and add permissions for **Google Play Android Developer API**
7. Go to **Keys → Add key → Create new key → JSON**
8. Download the JSON file

Then tell me (paste the JSON or let me know you have it) and I will:
- Store it as `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON`
- Set `GOOGLE_PLAY_PACKAGE_NAME` to `com.smforge.nextcareer`
- Enable the RTDN webhook so renewals and cancellations update premium status automatically

## 8. RTDN webhook URL (for later)

After server verification is wired, this is the webhook URL for Google Play real-time developer notifications:

```
https://nextcareer.one/api/public/play-rtdn?token=YOUR_TOKEN
```

I will generate the `YOUR_TOKEN` secret and give you the full URL once you reach step 7.
