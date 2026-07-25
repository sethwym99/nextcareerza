Since Google Play Billing is now working, clean up the Android upgrade screen by removing the diagnostic debug panel and all related state/effects/imports.

Changes to `src/routes/_authenticated.upgrade.tsx`:
- Remove the "Show debug info" toggle button and the entire expanded debug panel (backend setup, service account, endpoint checks, billing details JSON).
- Remove `showDebug`, `setupCheck`, `setupError`, and `serviceAccountInfo` state.
- Remove the `useEffect` hooks that fetch `checkPlayBillingSetup` and `getPlayServiceAccountInfo` and the `useServerFn` hooks for them.
- Remove unused imports: `Bug`, `ChevronDown`, `ChevronUp`.
- Remove the now-unused `PlaySetupCheck` and `ServiceAccountInfo` local type definitions.
- Keep the product listing, purchase/restore buttons, and the subscription terms footer intact.

No backend or server-function changes are needed.