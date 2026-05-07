-- =====================================================================
-- Phase 26 — Audit log retention policy.
-- Cancella row di audit_log più vecchie di 365 giorni.
-- Esposto come RPC SECURITY DEFINER chiamabile dal cron Node.
-- Volume atteso: ~5K row/anno (50 utenti × ~100 azioni admin) → safe.
-- =====================================================================

CREATE OR REPLACE FUNCTION public.cron_cleanup_audit_log(p_days integer DEFAULT 365)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted integer;
BEGIN
  WITH del AS (
    DELETE FROM public.audit_log
     WHERE created_at < (now() - make_interval(days => p_days))
    RETURNING id
  )
  SELECT count(*) INTO v_deleted FROM del;
  RETURN v_deleted;
END $$;

-- Solo service_role può eseguire (chiamata dal cron Node)
REVOKE EXECUTE ON FUNCTION public.cron_cleanup_audit_log(integer) FROM anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.cron_cleanup_audit_log(integer) TO service_role;

-- Test idempotente: deve tornare 0 (niente da cancellare appena creata la function)
SELECT public.cron_cleanup_audit_log(365) AS deleted_rows;
