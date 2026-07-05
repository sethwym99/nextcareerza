## Plan

1. **Confirm the exact failing backend check**
   - Use the Android Upgrade debug panel to identify whether the failure is only `Package access` or also `Token exchange`.
   - If `Token exchange` is OK but `Package access` is denied, the backend credential is valid but not authorized for this app/package in Google Play.

2. **Verify backend configuration values**
   - Check that `GOOGLE_PLAY_PACKAGE_NAME` matches the Android package exactly.
   - Check that `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` is present and belongs to the same service account you added in Google Play permissions.
   - Do not expose or print the private key.

3. **Improve backend diagnostics if needed**
   - Update the Google Play setup check to return a safer, clearer error message that distinguishes:
     - missing backend settings
     - token exchange failure
     - package name mismatch
     - service account permission/access denial
   - Keep sensitive Google error bodies server-side only.

4. **Validate the Google Play API call path**
   - Confirm the setup check calls the Android Publisher API using OAuth2 service-account access tokens, not a simple API key.
   - Confirm it checks the configured package via `/androidpublisher/v3/applications/{package}/inappproducts`.

5. **If permissions were just added, account for propagation**
   - Google Play permissions can take time to propagate.
   - After waiting, re-open the Android app, go to Upgrade, tap **Show debug info**, and confirm:
     - Package: set
     - Service account: set
     - Token exchange: ok
     - Package access: ok

6. **If package access still fails**
   - Re-check the Play Console service-account user permissions for the exact app.
   - Ensure the service account has app-level access, plus permissions needed for subscriptions/orders.
   - Confirm the app has at least one active internal testing release and the package name matches the built app.

## Technical details

The current backend already uses the correct mechanism: a service-account JSON is used to mint an OAuth2 JWT bearer access token, then it calls the Google Play Developer API. The error `Google Play API access is denied for this service account` usually means token generation succeeded, but Google Play rejected access to the configured package. That points to Play Console permissions, package-name mismatch, or propagation delay rather than a frontend purchase issue.