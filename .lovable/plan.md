## Rotate `GOOGLE_PLAY_RTDN_TOKEN` and show the value

The secret already exists but its value can't be read back. To give you a fresh token you can paste into the Pub/Sub push endpoint URL, I'll rotate it.

### Steps
1. Delete the current `GOOGLE_PLAY_RTDN_TOKEN` secret (`delete_secret`).
2. Mint a new 48-char random value and store it (`generate_secret`, length 48).
3. Display the new value to you **once** in chat so you can paste it into the Pub/Sub push subscription endpoint:
   ```
   https://nextcareer.one/api/public/play-rtdn?token=<NEW_TOKEN>
   ```
4. Remind you to update any existing Pub/Sub push subscription with the new URL (the old token stops working the moment it's rotated).

### No code changes
The webhook route (`src/routes/api/public/play-rtdn.ts`) already reads `process.env.GOOGLE_PLAY_RTDN_TOKEN`, so nothing in the app needs to change.
