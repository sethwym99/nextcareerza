
## Goal

Replace the current paste-a-URL Smart Apply flow with a **Job Search + Auto-Tailor** experience. The user types a role + location, sees real live jobs, clicks one, and gets a tailored CV + cover letter + match score generated against their saved profile CV.

## User flow

1. User opens `/smart-apply`.
2. Inputs: role (e.g. "Frontend Developer"), optional location (e.g. "Cape Town" or "Remote"), optional seniority.
3. Hit Search → grid of 10–20 live job cards (title, company, location, snippet, posted date, link to original).
4. Click a card → side panel opens, runs the tailor step using their saved base CV:
   - Match score
   - Matched / missing skills
   - Tailored CV
   - Cover letter
   - Salary estimate
5. "Save pack" pushes it into the existing tracker + `application_packs` table (already wired).
6. Premium gate stays — free users see an upgrade card instead of the search.

## How job search works (technical)

- Use **Firecrawl** via the existing standard connector for the search step (`firecrawl.search` with the role+location query, time-filtered to last month, limit 20). Firecrawl returns title/url/description from major job boards without us scraping per-site.
- No URL fetching needed for the tailor step anymore — we pass the search result's title + company + description snippet directly to the model. This kills the "site blocks scraping" failure mode that broke the old flow.
- If Firecrawl isn't connected yet, prompt the user once to connect it (managed connection, no key needed from them).

## Backend changes (`src/lib/smart-apply.functions.ts`)

- Keep: `getBaseCv`, `saveBaseCv`, `saveApplicationPack`, `getApplicationPack`, premium enforcement.
- Remove: `smartApply` (URL-fetch + monolithic generate), `fetchJobPage`, `htmlToText`.
- Add:
  - `searchJobs({ role, location?, seniority? })` — calls Firecrawl gateway, returns normalized `{id, title, company, location, url, snippet, postedAt}[]`. Premium-gated.
  - `tailorForJob({ jobTitle, company, location, jobSnippet, cvText })` — runs the existing two-step structured generation (job info extract → tailored pack). Premium-gated. Returns the same shape the UI already renders.

## Frontend changes (`src/routes/_authenticated.smart-apply.tsx`)

- Rewrite around two panes:
  - **Left**: search form + results list (cards).
  - **Right**: selected job's tailor result (re-uses the existing `ResultPanel`).
- Loading states per pane, empty state ("Search to see live jobs"), error state for Firecrawl quota/connection.
- Keep the "Save pack" → tracker integration unchanged.
- Keep the CV editor, but move it into a collapsible "Your CV" drawer at the top so it doesn't dominate the layout (it auto-loads from profile like today).

## Premium gate

Unchanged behaviour — both `searchJobs` and `tailorForJob` check `profiles.plan === 'premium'` server-side and throw with the existing "Upgrade to unlock" message. UI shows the upgrade card for non-premium users instead of the search box.

## Out of scope

- No per-job auto-apply / form submission.
- No saving search history.
- No new tables — `application_packs` already handles saved packs.
- Old `usage_events` row is kept (logged on each `tailorForJob` call).

## Files touched

- `src/lib/smart-apply.functions.ts` — rewrite to add `searchJobs` + `tailorForJob`, remove old `smartApply`.
- `src/routes/_authenticated.smart-apply.tsx` — rewrite UI around search + tailor split.
- Firecrawl connector — link via `standard_connectors--connect` if not already linked.
