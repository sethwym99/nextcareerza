CREATE TABLE public.saved_job_searches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL,
  location text NOT NULL DEFAULT '',
  seniority text NOT NULL DEFAULT '',
  frequency text NOT NULL DEFAULT 'daily',
  is_active boolean NOT NULL DEFAULT true,
  last_run_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.saved_job_searches TO authenticated;
GRANT ALL ON public.saved_job_searches TO service_role;

ALTER TABLE public.saved_job_searches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own saved job searches"
ON public.saved_job_searches
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_saved_job_searches_user_active ON public.saved_job_searches(user_id, is_active);

CREATE TRIGGER saved_job_searches_updated_at
BEFORE UPDATE ON public.saved_job_searches
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.search_alerted_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  search_id uuid NOT NULL REFERENCES public.saved_job_searches(id) ON DELETE CASCADE,
  job_url text NOT NULL,
  title text NOT NULL,
  company text NOT NULL,
  location text DEFAULT '',
  snippet text DEFAULT '',
  source text DEFAULT '',
  notified boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.search_alerted_jobs TO authenticated;
GRANT ALL ON public.search_alerted_jobs TO service_role;

ALTER TABLE public.search_alerted_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own alerted jobs"
ON public.search_alerted_jobs
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_search_alerted_jobs_search_url ON public.search_alerted_jobs(search_id, job_url);
CREATE INDEX idx_search_alerted_jobs_user_notified ON public.search_alerted_jobs(user_id, notified);