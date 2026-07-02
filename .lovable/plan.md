## Objective
Wire Codemagic to sign the release `.aab` so it can be uploaded to Google Play Console.

## What's already in place
- `android/app/build.gradle` reads `key.properties` and applies `signingConfigs.release` when present.
- `codemagic.yaml` has a "Set up signing" step that writes `key.properties` from env vars (`KEYSTORE_PATH`/`CM_KEYSTORE_PATH`, `KEYSTORE_PASSWORD`, `KEY_ALIAS`, `KEY_PASSWORD`) before `./gradlew bundleRelease`.
- `android/.gitignore` already ignores `*.jks`, `*.keystore`, and `key.properties`.

## What you do in Codemagic UI (I can't do this)
1. **Generate a keystore locally** (once):
   ```bash
   keytool -genkey -v -keystore nextcareer-upload.keystore \
     -alias nextcareer -keyalg RSA -keysize 2048 -validity 10000
   ```
   Save the keystore password and key password somewhere safe (password manager). Losing the keystore = can't update the app ever again.

2. **Upload keystore to Codemagic**
   - codemagic.io → your app → **Settings** → **Code signing identities** → **Android keystores** → **Add keystore**
   - Upload `nextcareer-upload.keystore`
   - Reference name: `nextcareer_keystore`
   - Alias: `nextcareer`
   - Keystore password + key password: the ones you just chose

3. **Attach keystore to the workflow**
   - Settings → **Environment variables** (or the workflow's "Code signing" tab)
   - Add the `nextcareer_keystore` reference to the `nextcareer-android` workflow
   - Codemagic will auto-expose: `CM_KEYSTORE_PATH`, `CM_KEYSTORE_PASSWORD`, `CM_KEY_ALIAS`, `CM_KEY_PASSWORD`

4. **Add 3 plain env vars** (because the YAML currently reads `KEYSTORE_PASSWORD`, `KEY_ALIAS`, `KEY_PASSWORD` — not the `CM_*` names):
   - `KEYSTORE_PASSWORD` = your keystore password
   - `KEY_ALIAS` = `nextcareer`
   - `KEY_PASSWORD` = your key password
   - Mark all three as **Secure**

5. **Re-run the build.** Artifact will be a signed `.aab` ready for Play Console → Internal testing.

## Code change I will make
Small robustness fix to `codemagic.yaml`: also accept Codemagic's native `CM_KEYSTORE_PASSWORD` / `CM_KEY_ALIAS` / `CM_KEY_PASSWORD` variables so you don't have to duplicate them as plain env vars in step 4. After the change, uploading the keystore in step 2–3 is enough — step 4 becomes optional.

```yaml
- name: Set up signing
  script: |
    KEYSTORE="${CM_KEYSTORE_PATH:-$KEYSTORE_PATH}"
    KS_PASS="${CM_KEYSTORE_PASSWORD:-$KEYSTORE_PASSWORD}"
    K_ALIAS="${CM_KEY_ALIAS:-$KEY_ALIAS}"
    K_PASS="${CM_KEY_PASSWORD:-$KEY_PASSWORD}"
    if [ -n "$KEYSTORE" ] && [ -n "$KS_PASS" ] && [ -n "$K_ALIAS" ] && [ -n "$K_PASS" ]; then
      echo "storeFile=$KEYSTORE" > android/key.properties
      echo "storePassword=$KS_PASS" >> android/key.properties
      echo "keyAlias=$K_ALIAS" >> android/key.properties
      echo "keyPassword=$K_PASS" >> android/key.properties
    else
      echo "Signing vars missing — build will produce an UNSIGNED aab"
    fi
```

## Verification
After next Codemagic run, check the build log for the "Set up signing" step (should not print the "missing" warning) and confirm the artifact filename is `app-release.aab` (not `app-release-unsigned.aab`).
