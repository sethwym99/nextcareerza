The user wants to focus exclusively on Google Play Store for RevenueCat native IAP and handle App Store later. The codebase already supports Android-only, but it can be clearer and more helpful when things aren't configured yet.

## What will change

1. **Native upgrade empty-state guidance**
   - When `loadOfferings()` returns no packages, show specific step-by-step instructions for Google Play + RevenueCat setup instead of the generic "Subscriptions are not available right now" message.
   - Include: create products in Google Play Console, connect the service account in RevenueCat, copy the public SDK key (`goog_...`), and set it as `VITE_REVENUECAT_ANDROID_KEY`.

2. **IAP config — iOS truly optional**
   - Update `src/lib/iap.ts` so that missing iOS keys do not produce console warnings on Android. The warning should only fire for the current platform.

3. **RevenueCat debug panel (hidden in production)**
   - Add a small, collapsible debug section on the native upgrade page that shows:
     - Whether RevenueCat is configured
     - The current platform
     - Raw offering data (if any)
   - This helps the user see exactly what's happening when they paste in the API key.

## What the user still needs to do themselves
- Create subscription products in Google Play Console
- Connect RevenueCat to Google Play (service account + JSON)
- Create an entitlement named `premium` in RevenueCat
- Paste the RevenueCat **public SDK key** (`goog_...`) into the project when they have it

## No App Store changes
- All iOS-related code stays as-is; it simply becomes silent/non-blocking when iOS keys are absent.

## Out of scope
- We cannot create Google Play Console products or RevenueCat connections on the user's behalf. Those are external dashboard tasks.