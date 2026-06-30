# Build NextCareer for Google Play

End-to-end guide to produce a signed `.aab` and upload it to Internal testing.

---

## 0. One-time install (your machine)

- **Android Studio** (latest) — installs JDK 17 + Android SDK automatically.
- **Node 20+** and **bun** (`npm i -g bun`).

Open Android Studio once so it finishes SDK setup (it'll prompt to install platform-tools, SDK 34, etc. — accept everything).

---

## 1. Build the web bundle + sync into Android

From the project root:

```bash
git pull
bun install
bun run build
bunx cap sync android
```

`cap sync` copies the built web app into `android/app/src/main/assets/public/` and registers Capacitor plugins (including `cordova-plugin-purchase` for Google Play Billing).

> The `android/` folder is checked into the repo. The Play Billing permission
> (`com.android.vending.BILLING`) is already in `AndroidManifest.xml`, and
> `applicationId` is `com.smforge.nextcareer`. Don't change the appId after the
> first Play upload — it's permanent.

---

## 2. Open in Android Studio

```bash
bunx cap open android
```

Wait for Gradle sync (first time: 5–10 min).

---

## 3. Generate a signed App Bundle

In Android Studio:

```
Build → Generate Signed App Bundle / APK
  → Android App Bundle → Next
  → Create new…              (first time only)
       Key store path: ~/keystores/nextcareer.jks
       Password: <pick a strong one — SAVE IT>
       Key alias: nextcareer
       Key password: <same or different — SAVE IT>
       Validity: 25 years
       Certificate: fill name + org
  → Next
  → Build variant: release → Finish
```

⚠️ **Back up `nextcareer.jks` + both passwords somewhere safe (password manager).** If you lose them you can never push another update to this app on Play.

Output: `android/app/release/app-release.aab`

---

## 4. Play Console — create the app

1. https://play.google.com/console → **Create app**
2. Name: **NextCareer** · Language: English · Type: App · Free
3. Accept the declarations → Create app.

### App content checklist (left sidebar → App content)

Fill each one until it's green:

- Privacy policy → `https://nextcareer.one/privacy`
- App access → All functionality available without restrictions (or provide test credentials)
- Ads → No
- Content rating → run the questionnaire
- Target audience → 18+
- Data safety → declare what you collect (email, name, usage data)
- Government apps → No
- News app → No
- COVID-19 tracing → No
- Financial features → No

---

## 5. Upload to Internal testing

`Test and release → Testing → Internal testing → Create new release`

1. Upload `app-release.aab`
2. Release name: auto
3. Release notes: `Initial internal build`
4. Save → Review release → **Start rollout to Internal testing**

Then `Testers` tab → Create an email list → Add `socool9123@gmail.com` → Save.

Copy the **opt-in URL**, open it on your Android phone, tap "Become a tester", then install from the Play Store link. (5–15 min after upload.)

---

## 6. Create the products

Once the bundle is processed, the **Monetise with Play** menu unlocks the product screens.

### Subscriptions (`Monetise with Play → Subscriptions`)

Create two, exactly these IDs:

| Product ID                     | Base plan         | Billing period |
| ------------------------------ | ----------------- | -------------- |
| `nextcareer_premium_monthly`   | monthly-autorenew | P1M            |
| `nextcareer_premium_yearly`    | yearly-autorenew  | P1Y            |

Set price per country, activate base plan, activate subscription.

### One-time product (`Monetise with Play → In-app products`)

| Product ID                     | Type    |
| ------------------------------ | ------- |
| `nextcareer_premium_lifetime`  | Managed |

Set price → Activate.

---

## 7. Ping Lovable

Once the three products are **active**, message in chat:
> "Products are live, ready for server verification."

Lovable will then:
- Take your Google Cloud service-account JSON as a secret.
- Subscribe the Play RTDN Pub/Sub topic to `/api/public/play-rtdn`.
- Walk you through a sandbox purchase from the internal testing track.

---

## Updating later

Whenever you change web code:

```bash
bun run build && bunx cap sync android
```

Bump `versionCode` in `android/app/build.gradle` (1 → 2 → 3 …) before every new Play upload, then repeat step 3.
