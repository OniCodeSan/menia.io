-- =====================================================================
-- Phase 24 — Hardening: RLS sulle 6 tabelle _archived_* del refactor T1.
--
-- Le tabelle archived sono dati legacy del vecchio token system: contengono
-- transazioni, payout, log finanziari, log fraud, webhook events, payment
-- orders. Attualmente hanno RLS DISABLED (eredità del refactor T1) il che
-- significa che con la sola anon key chiunque può leggerle via PostgREST.
--
-- Fix:
--   1. ENABLE ROW LEVEL SECURITY
--   2. Policy SELECT solo per role=admin via profiles. Service-role bypassa
--      RLS automaticamente, quindi il backend continua a poterle leggere.
--   3. Niente policy INSERT/UPDATE/DELETE → solo service_role può scriverle
--      (i dati sono frozen dopo T1, non vanno modificati).
-- =====================================================================

DO $$
DECLARE
  t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    '_archived_token_transactions',
    '_archived_payout_requests',
    '_archived_webhook_events',
    '_archived_financial_logs',
    '_archived_fraud_logs',
    '_archived_payment_orders'
  ])
  LOOP
    -- Verifica che la tabella esista prima di toccarla
    IF EXISTS (
      SELECT 1 FROM information_schema.tables
       WHERE table_schema = 'public' AND table_name = t
    ) THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
      EXECUTE format('DROP POLICY IF EXISTS "archived_select_admin" ON public.%I', t);
      EXECUTE format($p$
        CREATE POLICY "archived_select_admin" ON public.%I
          FOR SELECT USING (
            EXISTS (
              SELECT 1 FROM public.profiles
               WHERE id = auth.uid() AND role = 'admin'
            )
          )
      $p$, t);
      RAISE NOTICE '✓ RLS abilitata + policy admin-only su %', t;
    ELSE
      RAISE NOTICE '⊘ Skip: tabella % non esiste', t;
    END IF;
  END LOOP;
END $$;

-- ---------------------------------------------------------------------
-- Verifica finale: dovrebbe stampare 6 righe con rowsecurity = true
-- ---------------------------------------------------------------------
SELECT
  schemaname,
  tablename,
  rowsecurity AS rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename LIKE '\_archived\_%'
ORDER BY tablename;
