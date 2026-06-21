
-- Prevent privilege escalation: block non-service callers from changing plan
CREATE OR REPLACE FUNCTION public.prevent_plan_self_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.plan IS DISTINCT FROM OLD.plan AND current_setting('role') <> 'service_role' THEN
    RAISE EXCEPTION 'Plan can only be changed by the server';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_prevent_plan_self_update ON public.profiles;
CREATE TRIGGER profiles_prevent_plan_self_update
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.prevent_plan_self_update();

-- Explicit deny policies on payment_events for client roles (writes only via service_role)
CREATE POLICY "Deny client inserts on payment_events"
ON public.payment_events FOR INSERT TO anon, authenticated
WITH CHECK (false);

CREATE POLICY "Deny client updates on payment_events"
ON public.payment_events FOR UPDATE TO anon, authenticated
USING (false) WITH CHECK (false);

CREATE POLICY "Deny client deletes on payment_events"
ON public.payment_events FOR DELETE TO anon, authenticated
USING (false);
