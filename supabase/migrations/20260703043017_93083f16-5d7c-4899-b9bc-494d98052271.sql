
CREATE TABLE public.shortlisted_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  job_url TEXT NOT NULL,
  title TEXT NOT NULL,
  company TEXT NOT NULL,
  location TEXT DEFAULT '',
  snippet TEXT DEFAULT '',
  source TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, job_url)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shortlisted_jobs TO authenticated;
GRANT ALL ON public.shortlisted_jobs TO service_role;
ALTER TABLE public.shortlisted_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own shortlist" ON public.shortlisted_jobs
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
