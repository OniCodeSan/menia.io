-- =====================================================================
-- Phase 9 — Course landing fields (sales page structure)
-- Adds a single jsonb column `landing_data` holding:
--   { learning_outcomes: [..], target_audience: [..], for_whom_not: [..],
--     faq: [{q,a}], bonus: ".." }
-- Single column = no schema churn when sections evolve.
-- =====================================================================

ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS landing_data jsonb NOT NULL DEFAULT '{}'::jsonb;
