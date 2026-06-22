## Smart Apply — the differentiator

Right now NextCareer has six separate tools the user has to run one-by-one. A real "game changer" for job seekers is collapsing the whole apply-to-a-job workflow into a single screen:

> Paste a job link → in ~15 seconds get a tailored CV, a tailored cover letter, a match score with missing keywords, and a salary range — then save the whole pack to your tracker with one click.

This is the kind of thing recruiting tools like Teal / Huntr / Simplify charge for, and nothing in the current product matches it. It reuses the AI functions we already have and adds two new pieces (job-URL ingestion + salary estimate). Scope is medium: 1 new route, 2 new server functions, 1 schema change, small tracker upgrade.

### What the user sees

New route `/smart-apply` (added to dashboard bento + landing features):

1. Paste a job posting URL **or** paste the description text.
2. App fetches the page, AI extracts: company, role, location, seniority, required skills, salary if listed.
3. Side-by-side panel renders:
   - **Match score** (reuses `jobMatchScore`) with matched / missing keywords.
   - **Tailored CV** (reuses `analyzeCv` with the job context — new optional `jobContext` arg) shown in a diff-style view vs. the user's saved CV.
   - **Tailored cover letter** (reuses `generateCoverLetter`).
   - **Salary insight**: AI-estimated range for that role + seniority + location, with a "based on public data" disclaimer.
4. One button: **Save to tracker** → creates an `applications` row prefilled (company, role, URL, status `applied`, date today) AND stores the generated pack so the user can reopen it from the tracker.

### Tracker upgrade

Each tracker row gets a "View application pack" action that opens the saved tailored CV + cover letter + match report. This makes the tracker actually useful instead of being a glorified spreadsheet.

### Saved CV

For Smart Apply to work in one click, the user needs a CV on file. Add a tiny "My CV" section on the dashboard: paste once, stored on `profiles.base_cv_text`, reused by Smart Apply, CV Builder, Job Match, and Cover Letter (auto-fills those fields too — a nice quality-of-life win across the whole app).

### Free vs Premium

- Free: 3 Smart Apply runs / month (counts as one `smart_apply` usage event).
- Premium: unlimited + salary insight + saved pack history.

This gives Premium a concrete "save 30 min per application" pitch instead of just "unlimited".

---

## Technical notes

**New server functions** (`src/lib/ai.functions.ts` or new `smart-apply.functions.ts`):

- `ingestJobUrl({ url })` — server-side `fetch` of the URL, strip to text (regex + DOMParser-free heuristic; no headless browser, Cloudflare worker safe), then AI extract → `{ company, role, location, seniority, requiredSkills[], salaryRaw?, descriptionText }`. Falls back gracefully if the site blocks scraping (user can paste text instead).
- `smartApply({ jobUrl?, jobText?, cvText })` — orchestrates: ingest (if URL) → `jobMatchScore` → tailored CV rewrite → cover letter → salary estimate. Returns one bundled object. Logs `smart_apply` usage, enforces free limit (3/mo).
- `saveApplicationPack({ applicationId, pack })` — writes pack JSON to new `application_packs` row.

**Schema migration**:

```sql
ALTER TABLE public.profiles ADD COLUMN base_cv_text text;

CREATE TABLE public.application_packs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  application_id uuid REFERENCES public.applications(id) ON DELETE CASCADE,
  job_url text,
  job_company text,
  job_role text,
  match_score int,
  tailored_cv text,
  cover_letter text,
  salary_low numeric,
  salary_high numeric,
  salary_currency text,
  raw jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.application_packs TO authenticated;
GRANT ALL ON public.application_packs TO service_role;
ALTER TABLE public.application_packs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own packs" ON public.application_packs
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
```

**New route**: `src/routes/_authenticated.smart-apply.tsx` (under the existing auth gate). Add link in dashboard `tools` array + landing `features` array.

**Tracker route**: extend with a Sheet/Dialog that loads the matching `application_packs` row.

**URL ingestion safety**: cap response size at ~512KB, 8s timeout, strip scripts/styles, send first ~12k chars to the model. If the page is JS-only and returns no useful text, surface a friendly "Couldn't read this page — paste the description below" fallback.

**No scraping infrastructure / no third-party API keys** — keeps cost flat and stays within the existing Lovable AI Gateway credits.

---

## Out of scope (for this build)

- True auto-apply (filling forms on LinkedIn/Indeed) — legally and technically a different beast.
- Browser extension / job-board crawler.
- Chrome/Edge extension that injects Smart Apply on LinkedIn — good follow-up, not this turn.

If you approve, I'll implement in this order: migration → server functions → Smart Apply route → dashboard + landing surface → tracker pack viewer → saved-CV section.