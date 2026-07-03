## Plan

I found the Google Play secrets are configured, but there are no recent server logs for Play verification, which suggests the purchase may be failing before it reaches the backend.

### What I will do
1. **Add clearer Android billing diagnostics**
   - Show whether the app is running as Android native, billing initialized, products loaded, and the last billing/plugin error.
   - Surface useful messages instead of the generic “Google Play subscriptions are not set up yet.”

2. **Harden product loading**
   - Refresh Google Play products explicitly after store initialization.
   - Track loading failures from `cordova-plugin-purchase` so we can tell if products are inactive, IDs mismatch, or the app was not installed from the Play Store/internal testing track.

3. **Harden purchase verification**
   - Extract the Google purchase token from more receipt shapes returned by the billing plugin.
   - Log non-secret verification failures server-side so failed purchases are traceable.
   - Keep using backend verification before granting Premium.

4. **Add a safe backend setup check**
   - Add a protected server function that verifies the Google Play service-account token exchange works and returns only non-secret status.
   - Use it from the Android upgrade debug panel.

5. **Confirm premium activation path**
   - Ensure successful verification updates the user’s premium plan and stores the Play purchase record.
   - Keep RTDN for renewals/cancellations after initial purchase.

### What I will not change
- I will not expose secret values.
- I will not change the product IDs unless the diagnostics prove they mismatch Google Play Console.
- I will not alter web PayFast payments.