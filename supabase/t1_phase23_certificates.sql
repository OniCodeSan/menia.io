-- =====================================================================
-- Phase 23 — Course completion certificates
-- Auto-issued when a user completes 100% of a course's lessons.
-- One certificate per (user_id, course_id) — idempotent.
-- PDF stored in Supabase Storage bucket "certificates" (private).
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.certificates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  certificate_number text NOT NULL UNIQUE,   -- e.g. MENIA-2026-A3F7B2
  pdf_path text,                              -- storage path: certificates/<user>/<course>.pdf
  issued_at timestamptz NOT NULL DEFAULT now(),
  email_sent_at timestamptz,
  CONSTRAINT certificates_unique UNIQUE (user_id, course_id)
);

CREATE INDEX IF NOT EXISTS idx_certificates_user
  ON public.certificates (user_id, issued_at DESC);

CREATE INDEX IF NOT EXISTS idx_certificates_course
  ON public.certificates (course_id);

-- ---------------------------------------------------------------------------
-- RLS — owners can read their own certificates; admins can read all.
-- Insert/update only via service-role (backend).
-- ---------------------------------------------------------------------------
ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "certificates_select_own" ON public.certificates;
CREATE POLICY "certificates_select_own" ON public.certificates
  FOR SELECT USING (
    auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ---------------------------------------------------------------------------
-- Storage bucket "certificates" — private, 5MB max per file.
-- The backend uses service-role to upload; the frontend reads via signed URL.
-- ---------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('certificates', 'certificates', false, 5242880, ARRAY['application/pdf'])
ON CONFLICT (id) DO NOTHING;

-- Storage policy: owner can read own certificate file.
-- Path convention: certificates/<user_id>/<course_id>.pdf
DROP POLICY IF EXISTS "certificates_owner_read" ON storage.objects;
CREATE POLICY "certificates_owner_read" ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'certificates'
    AND (
      auth.uid()::text = (storage.foldername(name))[1]
      OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    )
  );
