
CREATE TABLE public.payment_events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  email text,
  provider text NOT NULL DEFAULT 'payfast',
  payment_status text NOT NULL,
  amount_gross numeric,
  currency text,
  pf_payment_id text,
  m_payment_id text,
  item_name text,
  raw jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.payment_events TO authenticated;
GRANT ALL ON public.payment_events TO service_role;

ALTER TABLE public.payment_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own payment events"
  ON public.payment_events FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX payment_events_user_created_idx ON public.payment_events (user_id, created_at DESC);
CREATE INDEX payment_events_email_created_idx ON public.payment_events (email, created_at DESC);
