I found the likely issue: the backend diagnostic is still checking the old `inappproducts` catalog endpoint. Google’s current docs say subscriptions should use the newer monetization endpoint, and the newer one-time product endpoint is `oneTimeProducts`.

Plan:

1. Update the Google Play setup check to call the newer catalog endpoints:
   - `GET /androidpublisher/v3/applications/{packageName}/oneTimeProducts?pageSize=1`
   - `GET /androidpublisher/v3/applications/{packageName}/subscriptions?pageSize=1`

2. Rename the diagnostic label from “In-app products catalog” to “One-time products catalog” so the app no longer points you at the outdated endpoint.

3. Keep purchase verification unchanged:
   - one-time purchase verification still uses Google’s purchase-token endpoint
   - subscription verification still uses `subscriptionsv2`
   - no secrets or raw tokens will be exposed

4. After implementation, you will not need to rerun Codemagic for this backend diagnostic change, but if the native product list still does not load inside the installed app, a new Android build may still be needed only if the client-side billing code changed.