-- =============================================================================
-- Phase 22: creator_promo_grants — anti-abuse table per la promo "primi N formatori"
-- =============================================================================
-- Tracking dei formatori che hanno usufruito di mesi gratuiti promo.
-- Non cumulabile: doppia chiave di sicurezza
--   1. email_normalized (lowercase, trim) UNIQUE
--   2. payment_link_hash (sha256 del link normalizzato) UNIQUE
-- Se uno dei due esiste già → no nuovo grant.
--
-- Tier promo (server-side enum):
--   tier=3 → primi 15 formatori → 3 mesi
--   tier=2 → 16°-45° → 2 mesi
--   tier=1 → 46°+ → 1 mese (standard, applicato anche senza promo grant)

CREATE TABLE IF NOT EXISTS public.creator_promo_grants (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id          uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email_normalized    text NOT NULL,
  payment_link_hash   text NOT NULL,
  months_granted      int  NOT NULL,
  tier                int  NOT NULL,
  granted_at          timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT creator_promo_grants_email_unique UNIQUE (email_normalized),
  CONSTRAINT creator_promo_grants_link_unique  UNIQUE (payment_link_hash),
  CONSTRAINT creator_promo_grants_tier_chk     CHECK (tier IN (1, 2, 3))
);

CREATE INDEX IF NOT EXISTS idx_creator_promo_grants_creator
  ON public.creator_promo_grants (creator_id);

CREATE INDEX IF NOT EXISTS idx_creator_promo_grants_granted_at
  ON public.creator_promo_grants (granted_at DESC);

-- ---------------------------------------------------------------------------
-- RLS: solo lettura pubblica del COUNT (non delle email/link), scrittura
-- riservata al service-role (server side via /api/creator/claim-promo).
-- ---------------------------------------------------------------------------
ALTER TABLE public.creator_promo_grants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS cpg_no_select   ON public.creator_promo_grants;
DROP POLICY IF EXISTS cpg_no_modify   ON public.creator_promo_grants;
DROP POLICY IF EXISTS cpg_self_select ON public.creator_promo_grants;

-- L'utente può vedere solo il PROPRIO grant (per UI conferma)
CREATE POLICY cpg_self_select ON public.creator_promo_grants
  FOR SELECT USING (auth.uid() = creator_id);
-- INSERT solo via service-role (niente policy → blocca anon/authenticated)

-- ---------------------------------------------------------------------------
-- View pubblica per il counter live in home (count senza esporre dati sensibili)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.creator_promo_counter AS
SELECT
  COUNT(*) FILTER (WHERE tier = 3)::int AS tier3_used,
  COUNT(*) FILTER (WHERE tier = 2)::int AS tier2_used,
  COUNT(*)::int AS total_grants
FROM public.creator_promo_grants;

GRANT SELECT ON public.creator_promo_counter TO anon, authenticated;
