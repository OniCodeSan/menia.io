-- =====================================================================
-- Phase 15 — Global student subscription paywall (€0.99/month).
-- Trial 30gg auto-creato al sign-up; cron giornaliero gestisce expire.
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.platform_subscriptions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  status      text NOT NULL CHECK (status IN ('trial','active','past_due','canceled','expired')),
  trial_start          timestamptz,
  trial_end            timestamptz,
  current_period_start timestamptz,
  current_period_end   timestamptz,
  cancel_at_period_end boolean NOT NULL DEFAULT false,
  external_provider        text,
  external_customer_id     text,
  external_subscription_id text,
  amount_cents integer NOT NULL DEFAULT 99,
  currency     text NOT NULL DEFAULT 'EUR',
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS platform_subs_status_idx
  ON public.platform_subscriptions(status, current_period_end);
CREATE INDEX IF NOT EXISTS platform_subs_trial_end_idx
  ON public.platform_subscriptions(trial_end) WHERE status = 'trial';

ALTER TABLE public.platform_subscriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ps_select_own" ON public.platform_subscriptions;
CREATE POLICY "ps_select_own" ON public.platform_subscriptions
  FOR SELECT USING (user_id = auth.uid());

-- Trigger: ogni nuovo profilo riceve 30gg di trial automatico
CREATE OR REPLACE FUNCTION public.grant_platform_trial()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.platform_subscriptions (user_id, status, trial_start, trial_end)
  VALUES (NEW.id, 'trial', now(), now() + interval '30 days')
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS profiles_platform_trial ON public.profiles;
CREATE TRIGGER profiles_platform_trial
AFTER INSERT ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.grant_platform_trial();

-- Backfill utenti esistenti
INSERT INTO public.platform_subscriptions (user_id, status, trial_start, trial_end)
SELECT p.id, 'trial', now(), now() + interval '30 days'
FROM public.profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM public.platform_subscriptions s WHERE s.user_id = p.id
);

-- RPC cron expire
CREATE OR REPLACE FUNCTION public.cron_expire_platform_subscriptions()
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_count integer := 0;
  v_affected integer;
BEGIN
  UPDATE public.platform_subscriptions
     SET status = 'expired', updated_at = now()
   WHERE status = 'trial' AND trial_end < now();
  GET DIAGNOSTICS v_affected = ROW_COUNT; v_count := v_count + v_affected;

  UPDATE public.platform_subscriptions
     SET status = 'expired', updated_at = now()
   WHERE status IN ('active','past_due')
     AND cancel_at_period_end = true
     AND current_period_end < now();
  GET DIAGNOSTICS v_affected = ROW_COUNT; v_count := v_count + v_affected;

  RETURN v_count;
END $$;
