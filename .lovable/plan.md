# NextCareer — Job Search Automation & Retention Loop

## Goal
Turn NextCareer into a daily-use job-search companion by automating the parts users repeat every day: finding fresh jobs and understanding what is working in their search.

## What we will build

### 1. Smart Job Alerts (saved searches)
Let users save a Smart Apply search (role, location, seniority) and get notified when new matching jobs appear.

- New `saved_job_searches` table: user_id, query JSON (role/location/seniority), frequency (daily/weekly), last_run_at, active, created_at.
- New `search_alerted_jobs` table: user_id, search_id, job_url (deduplication so the same job is never alerted twice).
- New server function `saveJobSearch`, `listSavedSearches`, `deleteSavedSearch`, `runSavedSearch`.
- Daily cron job under `/api/public/hooks/run-job-alerts` that loops active saved searches, runs the existing `searchJobs` logic, and records any new URLs.
- Notifications:
  - Native: schedule a local push notification with the top 1-3 new jobs.
  - Web: enqueue a weekly/daily email digest via the existing email queue (only if email is verified).
- Free users: 1 saved search, daily only. Premium: unlimited, daily + weekly.
- UI: add a "Save alert" button inside Smart Apply and a new "Alerts" tab to manage/delete searches.

### 2. Application Analytics Dashboard
Show users what is actually working in their job search so they keep coming back to check progress.

- New route `/analytics` (linked from dashboard and tracker).
- Server function `getApplicationAnalytics` aggregating the existing `applications` and `application_packs` tables.
- Metrics: total applications, response rate, interview rate, offer rate, average days per stage, current pipeline counts, weekly activity chart, top sources, best-match jobs applied to.
- UI: simple cards + a weekly bar chart (recharts or custom SVG) and a pipeline funnel.
- No new tables needed; read-only aggregation.

### 3. One-tap "Apply Pack" from shortlist
From a shortlisted job, generate a complete application package and optionally track it in one action.

- Extend Smart Apply shortlist with a "Prepare application" action.
- Calls existing `tailorForJob` to produce CV + cover letter.
- Adds an optional "Track this application" checkbox that creates a tracker row pre-filled with company, role, URL, and status `applied`.
- Pre-writes a follow-up email draft ("Hi [Hiring Manager], I applied for...") the user can copy/paste.
- Premium-only (uses the existing premium-gated tailor function).

## Out of scope for this plan
- New payment providers or changes to Google Play Billing.
- New AI models or interview changes.
- Native-only widgets or share sheets.

## Acceptance criteria
- A user can save a Smart Apply search and receive a native push or email digest with new jobs.
- The analytics page loads real numbers from the user's applications.
- A user can tap "Prepare application" on a shortlisted job and land in the tracker with a tailored CV/cover letter ready.
- Free plan limits are enforced for saved searches.
