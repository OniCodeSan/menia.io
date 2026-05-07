-- =====================================================================
-- Phase 25 — Performance indexes su query frequenti.
-- Tutti CREATE INDEX IF NOT EXISTS → idempotente, safe su run multipli.
-- CONCURRENTLY non usato dentro la transazione SQL Editor; per tabelle
-- piccole è veloce, per tabelle >1M righe valutare migration manuale.
-- =====================================================================

-- 1. courses(creator_id) — usato da:
--    • creator KPI aggregation
--    • dashboard formatore "i miei corsi"
--    • lookup grant access
CREATE INDEX IF NOT EXISTS idx_courses_creator
  ON public.courses(creator_id);

-- 2. lesson_completions(course_id, user_id) — usato da:
--    • progress check ad ogni apertura corso
--    • certificate eligibility check (count completed vs total)
--    Indice composto perché le query filtrano per entrambe le colonne.
CREATE INDEX IF NOT EXISTS idx_lesson_completions_course_user
  ON public.lesson_completions(course_id, user_id);

-- 3. course_access(user_id, course_id) — gating accesso lezioni.
CREATE INDEX IF NOT EXISTS idx_course_access_user_course
  ON public.course_access(user_id, course_id);

-- 4. notifications(user_id, read, created_at) — badge count + lista feed.
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON public.notifications(user_id, read, created_at DESC)
  WHERE read = false;

-- NB: payment_orders è stata rinominata in _archived_payment_orders durante
-- il refactor T1 (vedi t1_refactor_phase1.sql). Nessun indice perf su
-- archive frozen — query su archived sono già limited via RLS admin-only.

-- ---------------------------------------------------------------------
-- Verifica finale: lista tutti gli indici creati
-- ---------------------------------------------------------------------
SELECT schemaname, tablename, indexname
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname IN (
    'idx_courses_creator',
    'idx_lesson_completions_course_user',
    'idx_course_access_user_course',
    'idx_notifications_user_unread'
  )
ORDER BY tablename, indexname;
