## No code changes needed

Enabling the Google Play Android Developer API is a Google Cloud Console setup step, not something in your app's code. Once enabled and linked to Play Console, your existing backend verification code will work.

## Steps to enable

1. **Open Google Cloud Console** → https://console.cloud.google.com
2. **Pick (or create) the project** you want to use for Play billing verification. Note the project name — Play Console must be linked to this same project.
3. **Enable the API**
   - Go to: APIs & Services → Library
   - Search: `Google Play Android Developer API`
   - Click it → **Enable**
4. **Create a service account** (if you don't have one)
   - IAM & Admin → Service Accounts → **Create service account**
   - Name it e.g. `play-billing-verifier`
   - Skip optional role grants → Done
   - Open the service account → **Keys** → Add key → JSON → download the file (keep it safe)
5. **Link the Cloud project to Play Console**
   - Play Console → **Setup → API access**
   - If not linked: click **Link existing project** and pick the Cloud project from step 2
   - Under **Service accounts**, find the one you just created → **Grant access**
   - Permissions needed for subscription/purchase verification:
     - View financial data, orders, and cancellation survey responses
     - Manage orders and subscriptions
   - Invite user / Save
6. **Wait ~5–10 minutes** for permissions to propagate before testing.

## Using the JSON key in your app

When you're ready to wire server-side verification, upload the service account JSON contents as a backend secret (e.g. `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON`) via the secrets tool — do not commit the JSON file to the repo. Let me know when you've completed the steps above and I'll wire the verification endpoint.

## Common gotchas

- "API not enabled" errors persist for a few minutes after enabling — retry after ~5 min.
- The Cloud project linked in Play Console **must** be the same one where you enabled the API.
- The service account must be granted access **inside Play Console** (step 5) — Cloud IAM roles alone are not enough.
