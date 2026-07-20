## Problem

On the installed Android app the Upgrade screen shows "Could not load subscription options" and the debug panel says:

- Billing initialized = **No**
- Products loaded = **0**
- Play API catalog = **ok** (backend + service account are fine)
- Last error = **null**

Backend is healthy, so the failure is on the client side inside `initBilling()` in `src/lib/play-billing.ts`. The reason we can't see *why* is that the module-level `lastError` is only written by `store.error` callbacks and the receipt validator — an exception thrown by `import("cordova-plugin-purchase")` or by `store.initialize([...])` bubbles up to the component's `catch`, which only calls `toast.error(...)` and `console.error(e)`. Nothing gets surfaced in the debug panel, so we're diagnosing blind.

Root cause is unconfirmed. Likely candidates (in order):
1. `cordova-plugin-purchase` native bridge isn't registered in the installed APK (would throw on import/initialize).
2. `store.initialize([GOOGLE_PLAY])` rejects with a specific Play error (e.g. licensing / billing service unavailable).
3. Store initialized but `store.products` stays empty (products not yet propagated to the tester account, or app not installed from the internal testing track).

## Plan

Add real error capture so the next screenshot tells us which of the three it is — no other behavior changes.

### 1. Capture initBilling failures — `src/lib/play-billing.ts`
- Wrap the body of `doInitBilling()` in try/catch; on catch, call `rememberError(e)` and re-throw so callers still see it.
- Wrap the dynamic `import("cordova-plugin-purchase")` in its own try/catch that records a distinct message like `"Failed to load billing plugin: <err>"` before re-throwing.
- After `store.initialize(...)`, if `initializeErrors.length > 0`, also set `lastError` (not only `rememberError`) so the debug panel's "Last error" field is populated.
- Add a `rememberEvent("Products still empty after update")` branch when `store.products.length === 0` after the `store.update()` retry, so the debug panel's "Last event" reflects it.

### 2. Surface the caught error in the UI — `src/routes/_authenticated.upgrade.tsx`
- In the `AndroidUpgrade` `catch (e)` block, refresh `billingStatus` and also stash `e?.message` in a new local `initError` state so the "no products" empty-state can render it inline (in addition to the toast).
- Add one line in the debug panel showing `Last event` (already returned by `getBillingStatus`) and `Last error` when present — currently only shown inside the `<details>` JSON dump, which is easy to miss.

### 3. No backend / plugin changes yet
Do not add new plugins, change `capacitor.config.ts`, or touch `codemagic.yaml`. We only need one more diagnostic build to point at the real cause. Once the next screenshot shows the actual error string, the follow-up fix will be small and targeted (re-sync cordova plugin, adjust product registration, or Play Console config).

### Verification
- Reinstall the internal-testing build.
- Open Upgrade → Show debug info → send a screenshot. We expect a concrete "Last error" like `Failed to load billing plugin: ...`, an `initialize` rejection message, or `Products still empty after update` — each maps to a different next fix.
