## Goal
Free users can only run **1 mock interview per month**. Premium stays unlimited.

## Changes

### `src/lib/ai.functions.ts`
- Replace the single `FREE_LIMIT = 3` with a per-feature map:
  - `interview_session` → 1
  - `cv_analysis` → 3 (unchanged)
- Update `enforceLimit` to read the cap from the map and use it both in the count check and the error message ("Free plan allows 1 interview per month. Upgrade for unlimited.").

### `src/routes/_authenticated.dashboard.tsx`
- Update the usage pill labeled "AI interviews" so its `limit` prop reflects `1` for free users (currently passes `3`). Premium users already see "Unlimited".

## What stays the same
- Usage is still tracked in `usage_events` and resets at the start of each UTC month.
- Premium gating logic, billing flow, and the interview UI itself are untouched.
- Upgrade copy in the existing paywall already points to the right place — no copy changes elsewhere.
