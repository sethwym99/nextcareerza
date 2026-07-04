Replace the stored `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` backend secret with the newly uploaded service account key (`nextcareer-play-api@nextcareer-500013.iam.gserviceaccount.com`, project `nextcareer-500013`).

Steps:
1. Use `secrets--update_secret` on `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` — opens a secure form; paste the full JSON from the uploaded file there.
2. After you save it, reopen the Android Upgrade screen → Show debug info to confirm "Token exchange: ok" and "Package access: ok".

No code changes. Reminder: make sure this service account is also linked in Google Play Console → Users and permissions with access to your app and the "View financial data, orders, and cancellation survey responses" + "Manage orders and subscriptions" permissions, otherwise package access will still fail.