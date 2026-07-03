## What to do

The code already reads two backend secrets that aren't set yet:
- `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` — the service account JSON contents
- `GOOGLE_PLAY_PACKAGE_NAME` — `com.smforge.nextcareer`

No code changes are needed. I'll set both secrets and verification will work end-to-end (both real-time developer notifications and the client-triggered verify call).

## Steps

1. Set `GOOGLE_PLAY_PACKAGE_NAME = com.smforge.nextcareer` via `set_secret`.
2. Set `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` to the JSON contents from `user-uploads://nextcareer-500013-c84bd3f3d7ed.json` via `set_secret`.
3. Confirm both appear via `fetch_secrets`.

## Important — rotate this key

You pasted the service account's **private key** into chat, which means it's now considered leaked. After I store it, please:

1. Go to Google Cloud Console → IAM & Admin → Service Accounts → `nextcareer-play-api@nextcareer-500013.iam.gserviceaccount.com` → Keys.
2. **Delete** key id `c84bd3f3d7eda9dd466c3bc17a041f8961a37b7a`.
3. Create a new JSON key, upload it here (attachment only — don't paste the contents), and I'll swap the secret.

## Then test

Once secrets are set (and ideally the key rotated), rebuild the Android internal test AAB, install on a device, buy a product, and the app will POST the purchase token to `verifyAndApply`, which will now succeed against the Play Developer API.
