-- =============================================================================
-- Phase 21: lesson_completions table for student progress tracking
-- =============================================================================
-- Una riga per (user, lesson) ogni volta che lo studente completa una lezione.
-- UNIQUE constraint impedisce doppi conteggi.
-- RLS: ognuno legge/scrive solo le proprie completions.

CREATE TABLE IF NOT EXISTS public.lesson_completions (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lesson_id    uuid NOT NULL REFERENCES public.course_lessons(id) ON DELETE CASCADE,
  course_id    uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  completed_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT lesson_completions_unique UNIQUE (user_id, lesson_id)
);

-- Indici per le query principali:
--  • progress per corso (user + course)
--  • "ultima lezione vista" (user + completed_at desc)
CREATE INDEX IF NOT EXISTS idx_lesson_completions_user_course
  ON public.lesson_completions (user_id, course_id);

CREATE INDEX IF NOT EXISTS idx_lesson_completions_user_at
  ON public.lesson_completions (user_id, completed_at DESC);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
ALTER TABLE public.lesson_completions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS lc_select_own ON public.lesson_completions;
CREATE POLICY lc_select_own ON public.lesson_completions
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS lc_insert_own ON public.lesson_completions;
CREATE POLICY lc_insert_own ON public.lesson_completions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS lc_delete_own ON public.lesson_completions;
CREATE POLICY lc_delete_own ON public.lesson_completions
  FOR DELETE USING (auth.uid() = user_id);

-- Niente UPDATE: una completion è atomica (insert o delete, no toggle update).
