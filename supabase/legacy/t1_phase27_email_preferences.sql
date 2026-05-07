-- =====================================================================
-- Phase 27 — Email preferences + bounce tracking.
--
-- Una row per utente con flags granulari:
--   • transactional: email obbligatorie (acquisti, conferme, sicurezza)
--     → NON disattivabili dall'utente (CAN-SPAM permette email transazionali)
--   • marketing:     email promozionali (broadcast creator, newsletter)
--     → l'unsubscribe le disattiva
--   • bounced:       hard-bounce rilevato → smetti di mandare TUTTO
--   • complained:    spam complaint → smetti di mandare TUTTO + non riesporre
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.email_preferences (
  user_id        uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  transactional  boolean NOT NULL DEFAULT true,
  marketing      boolean NOT NULL DEFAULT true,
  bounced        boolean NOT NULL DEFAULT false,
  bounced_at     timestamptz,
  bounce_reason  text,
  complained     boolean NOT NULL DEFAULT false,
  complained_at  timestamptz,
  unsubscribed_at timestamptz,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_email_prefs_bounced
  ON public.email_preferences (bounced) WHERE bounced = true;

CREATE INDEX IF NOT EXISTS idx_email_prefs_unsubscribed
  ON public.email_preferences (unsubscribed_at) WHERE unsubscribed_at IS NOT NULL;

-- ---- RLS ---------------------------------------------------------------
ALTER TABLE public.email_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "email_prefs_select_own" ON public.email_preferences;
CREATE POLICY "email_prefs_select_own" ON public.email_preferences
  FOR SELECT USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "email_prefs_update_own" ON public.email_preferences;
CREATE POLICY "email_prefs_update_own" ON public.email_preferences
  FOR UPDATE USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ---- Helper RPC (server-side) -----------------------------------------
-- Ritorna true se l'utente può ricevere email del tipo richiesto.
-- Usata dal backend prima di chiamare emails.send*.
CREATE OR REPLACE FUNCTION public.email_can_send(p_user_id uuid, p_kind text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT NOT EXISTS (
    SELECT 1 FROM public.email_preferences
    WHERE user_id = p_user_id
      AND (
        bounced = true
        OR complained = true
        OR (p_kind = 'marketing' AND marketing = false)
        OR (p_kind = 'transactional' AND transactional = false)
      )
  );
$$;

GRANT EXECUTE ON FUNCTION public.email_can_send(uuid, text) TO service_role, authenticated;

-- ---- Auto-create row al primo update (trigger su profiles INSERT) ------
-- Ogni nuovo utente ha auto una row email_preferences con default permissivi.
CREATE OR REPLACE FUNCTION public.create_email_prefs_on_profile()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.email_preferences (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS profiles_create_email_prefs ON public.profiles;
CREATE TRIGGER profiles_create_email_prefs
AFTER INSERT ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.create_email_prefs_on_profile();

-- Backfill utenti esistenti
INSERT INTO public.email_preferences (user_id)
SELECT id FROM public.profiles
ON CONFLICT (user_id) DO NOTHING;

-- Verifica finale
SELECT count(*) AS total_prefs_rows FROM public.email_preferences;
