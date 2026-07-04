Verify the Google Play backend is now healthy end-to-end.

Steps:
1. On your Android device, open the app → Upgrade screen → tap "Show debug info".
2. Confirm all four backend checks show OK:
   - Package: set
   - Service account: set
   - Token exchange: ok
   - Package access: ok
3. Confirm "Products loaded" is 3 and the three product IDs appear.
4. Tap a plan (e.g. monthly) and complete the Google Play test purchase with a licensed tester account. Debug panel should show "Purchase approved" → "Verifying …" → "Verified …".
5. Reload the app; your account should now show Premium.

If any check still fails, screenshot the debug panel and share it — I'll diagnose from there. No code changes needed for this step.