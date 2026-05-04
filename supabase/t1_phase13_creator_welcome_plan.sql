-- =====================================================================
-- Phase 13 — Welcome plan: 30 giorni di Starter gratis a ogni nuovo
-- creator. One-shot: se l'utente ha già qualunque record di subscription
-- (anche cancellato) NON viene rigranted, così non si possono ottenere
-- mesi gratis a catena.
-- =====================================================================

CREATE OR REPLACE FUNCTION public.grant_creator_welcome_plan()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- Solo se l'utente diventa creator e non ha mai avuto un abbonamento.
  IF NEW.role = 'creator'
     AND NOT EXISTS (
       SELECT 1 FROM public.creator_plan_subscriptions
       WHERE creator_id = NEW.id
     )
  THEN
    INSERT INTO public.creator_plan_subscriptions (
      creator_id, plan_id, status, started_at, expires_at,
      external_reference, granted_by
    ) VALUES (
      NEW.id,
      'starter',
      'active',
      now(),
      now() + interval '30 days',
      'welcome_gift',
      NEW.id
    );
    -- Ricomputa subito i KPI così visibility_score include il plan_boost.
    PERFORM compute_creator_kpi(NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

-- AFTER INSERT (registrazione diretta come creator)
-- AFTER UPDATE OF role (fan promosso a creator dall'admin o conversion flow)
DROP TRIGGER IF EXISTS profiles_creator_welcome_plan ON public.profiles;
CREATE TRIGGER profiles_creator_welcome_plan
AFTER INSERT OR UPDATE OF role ON public.profiles
FOR EACH ROW
WHEN (NEW.role = 'creator')
EXECUTE FUNCTION public.grant_creator_welcome_plan();

-- Backfill: i creator già registrati senza alcuna subscription ricevono
-- anch'essi il welcome (equità durante la beta).
INSERT INTO public.creator_plan_subscriptions (
  creator_id, plan_id, status, started_at, expires_at,
  external_reference, granted_by
)
SELECT
  p.id, 'starter', 'active',
  now(), now() + interval '30 days',
  'welcome_gift_backfill', p.id
FROM public.profiles p
WHERE p.role = 'creator'
  AND NOT EXISTS (
    SELECT 1 FROM public.creator_plan_subscriptions s
    WHERE s.creator_id = p.id
  );
