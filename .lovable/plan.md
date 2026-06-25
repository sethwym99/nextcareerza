## Goal

Separate the "marketing website" from the "real app" so logged-in users get a native app feel, not the landing page.

## Changes

### 1. Auto-redirect logged-in users away from `/`
- In `src/routes/index.tsx`, check session via `useAuth()`. If a session exists, `navigate({ to: "/dashboard", replace: true })` on mount.
- Anonymous visitors keep seeing the current marketing landing page (with phone mockup + "Get the app").

### 2. Rebuild `/dashboard` as a native app home screen
Replace the current bento-card dashboard in `src/routes/_authenticated.dashboard.tsx` with an iOS/Android-style home screen:

- **Top greeting strip**: small "Good morning, {firstName}" + date, plan badge on the right.
- **Quick stats row** (compact, 2 pills): CV analyses used `x/3`, Interviews used `x/3`. Tap → `/billing`. Hidden for premium; replaced with a single "Premium ✨ Unlimited" pill.
- **App icon grid** (the main visual): 4-column grid of large rounded gradient icon tiles (same colors as the landing mockup), each with label underneath. Tapping opens the tool. Tools: Smart Apply, CV Builder, Cover Letter, Job Match, Interview, Roadmap, Tracker, Upgrade (Crown icon, gold gradient).
- **Featured card** below the grid: Smart Apply highlight ("Paste a job link → tailored CV in seconds") as a wide gradient card.
- **No** bento cards, no big "Your career, accelerated" headline — that's website copy. Keep it tight and app-like.

Spacing tuned for mobile first (the bottom tab bar already exists in `_authenticated.tsx`).

### 3. Keep the rest as-is
- Bottom tab bar, sidebar drawer, paywall: no changes.
- Landing page: no changes beyond the redirect guard.
- "Get the app" CTAs on the landing page now effectively mean "Sign in / Sign up" for new visitors, which is correct.

## Files touched

- `src/routes/index.tsx` — add auth redirect at the top of `Landing()`.
- `src/routes/_authenticated.dashboard.tsx` — rewrite layout to icon-grid home screen.

No backend, route tree, or auth changes.
