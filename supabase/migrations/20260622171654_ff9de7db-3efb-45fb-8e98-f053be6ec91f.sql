ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS base_cv_text text;

CREATE TABLE public.application_packs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  application_id uuid REFERENCES public.applications(id) ON DELETE CASCADE,
  job_url text,
  job_company text,
  job_role text,
  job_location text,
  match_score int,
  matched_skills jsonb,
  missing_skills jsonb,
  tailored_cv text,
  cover_letter text,
  salary_low numeric,
  salary_high numeric,
  salary_currency text,
  salary_period text,
  raw jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.application_packs TO authenticated;
GRANT ALL ON public.application_packs TO service_role;

ALTER TABLE public.application_packs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own application packs"
  ON public.application_packs
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_application_packs_user ON public.application_packs(user_id, created_at DESC);
CREATE INDEX idx_application_packs_application ON public.application_packs(application_id);

CREATE TRIGGER set_application_packs_updated_at
  BEFORE UPDATE ON public.application_packs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();