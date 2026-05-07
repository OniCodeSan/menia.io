-- =====================================================================
-- Phase 7 — Course drafts: full-course snapshot autosave + recovery.
-- Versioned. Last 5 versions kept per course (cleanup runs daily).
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.course_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  creator_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  data jsonb NOT NULL,
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS course_drafts_latest_idx
  ON public.course_drafts(course_id, created_at DESC);

CREATE INDEX IF NOT EXISTS course_drafts_creator_idx
  ON public.course_drafts(creator_id, created_at DESC);

ALTER TABLE public.course_drafts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "course_drafts_select_own" ON public.course_drafts;
CREATE POLICY "course_drafts_select_own" ON public.course_drafts
  FOR SELECT USING (
    auth.uid() = creator_id
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- INSERT/UPDATE/DELETE only via service role (server-side)

-- Cleanup function: keep only last 5 versions per course
CREATE OR REPLACE FUNCTION public.cron_cleanup_course_drafts() RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_deleted integer;
BEGIN
  WITH ranked AS (
    SELECT id, row_number() OVER (PARTITION BY course_id ORDER BY created_at DESC) AS rn
    FROM course_drafts
  ),
  deleted AS (
    DELETE FROM course_drafts
    WHERE id IN (SELECT id FROM ranked WHERE rn > 5)
    RETURNING id
  )
  SELECT count(*) INTO v_deleted FROM deleted;
  RETURN v_deleted;
END;
$$;
