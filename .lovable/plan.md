Based on your answers:
- The backend JSON email matches the Play Console service account.
- Token exchange works.
- The remaining failing signal is the Play API/package/catalog check, even though permissions appear granted.

Plan:

1. Replace the broad “Package access” label with “Play API catalog check” so the app stops implying permissions are definitely missing.

2. Add a deeper authenticated diagnostic server function that safely checks:
   - configured package name vs `com.smforge.nextcareer`
   - service account email and project ID
   - OAuth token exchange
   - Google Play in-app products endpoint
   - Google Play subscriptions endpoint
   - sanitized Google error status/reason/message for each failed endpoint

3. Update the Android upgrade debug panel to show those endpoint-level results, so we can see whether Google is rejecting:
   - only in-app product reads
   - only subscription reads
   - the package/app lookup
   - the API/project linkage
   - or the product catalog state

4. Update the visible troubleshooting text to match this new diagnosis:
   - if service email matches and token exchange is OK, don’t say “permissions are missing” as the only cause
   - show likely next checks: Google Play Developer API linked project, app/package access propagation, active products/base plans, and install from Play testing track

5. Keep all secrets server-only. The debug panel will never expose the private key, raw JSON, OAuth token, or credential file contents.