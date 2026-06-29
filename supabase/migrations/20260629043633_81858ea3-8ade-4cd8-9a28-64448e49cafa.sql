
CREATE TABLE public.play_purchases (
  purchase_token text PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  product_id text NOT NULL,
  active boolean NOT NULL DEFAULT false,
  expires_at timestamptz,
  raw jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.play_purchases TO authenticated;
GRANT ALL ON public.play_purchases TO service_role;

ALTER TABLE public.play_purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own play purchases"
  ON public.play_purchases FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE TRIGGER play_purchases_updated_at
  BEFORE UPDATE ON public.play_purchases
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS premium_expires_at timestamptz;
