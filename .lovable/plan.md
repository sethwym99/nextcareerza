Plan: Google Play service-account diagnostic on upgrade screen

Goal
----
Help you verify that the `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` secret loaded by the app matches the service account invited in Google Play Console, without ever exposing the private key or full JSON in the UI.

What will be built
------------------
1. Safe server-side metadata endpoint
   - Create `getPlayServiceAccountInfo` in `src/lib/play-billing.functions.ts` (or a new `src/lib/play-billing.server.ts` helper called from it).
   - It reads `process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` on the server only.
   - Returns only:
     - `client_email`
     - `project_id` (from the JSON)
     - `private_key_present` (boolean)
     - `private_key_fingerprint` (first/last few characters + length, enough to spot the wrong key file)
     - `key_age_hint` if we can derive one (e.g., from the JSON `client_id` timestamp or file metadata; otherwise omit)
   - Never returns `private_key`, `client_id` secrets, or the raw JSON.

2. Upgrade-screen debug panel update
   - In `src/routes/_authenticated.upgrade.tsx`, fetch the metadata via `useServerFn` when the debug panel is opened.
   - Display:
     - Configured service account email
     - Whether the private key is present
     - A short fingerprint so you can confirm you uploaded the right file
   - Keep it inside the existing debug accordion so normal users never see it.

3. Security check
   - Confirm the new function does not log the full JSON or private key.
   - Confirm the response is only returned to authenticated users (use existing `requireSupabaseAuth` middleware or call from the `_authenticated` route component).

Files to change
---------------
- `src/lib/play-billing.functions.ts` — add `getPlayServiceAccountInfo` server function.
- `src/lib/play-billing.server.ts` — add helper that parses and redacts the JSON.
- `src/routes/_authenticated.upgrade.tsx` — wire the diagnostic into the debug panel.

Out of scope
------------
- No changes to Codemagic, Android build, or Google Play Console permissions.
- No changes to billing purchase flow.

Acceptance criteria
-------------------
- Opening the debug panel on `/upgrade` (Android) shows the configured service account email.
- The displayed email can be compared directly with the email invited in Play Console → Users and permissions.
- The private key value is never visible in the UI, network response, or server logs.