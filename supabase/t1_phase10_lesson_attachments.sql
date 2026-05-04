-- =====================================================================
-- Phase 10 — Lesson attachments (documents, handouts).
-- - documents bucket (public read for MVP, max 25MB)
-- - course_lessons.attachments jsonb [{ url, name, mime, size }]
-- =====================================================================

-- 1. Storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documents',
  'documents',
  true,
  26214400, -- 25MB
  ARRAY[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/zip',
    'application/x-zip-compressed',
    'text/plain',
    'text/csv',
    'application/json'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 26214400,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "documents_public_read" ON storage.objects;
CREATE POLICY "documents_public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'documents');

-- 2. Lesson attachments column
ALTER TABLE public.course_lessons
  ADD COLUMN IF NOT EXISTS attachments jsonb NOT NULL DEFAULT '[]'::jsonb;
