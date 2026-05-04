-- =====================================================================
-- Phase 6 — Videos storage bucket for course lesson uploads.
-- Public read (MVP), writes go through server with service role.
-- =====================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'videos',
  'videos',
  true,
  209715200,  -- 200MB
  ARRAY['video/mp4','video/webm','video/quicktime','video/x-m4v']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 209715200,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Public read policy (MVP — DRM/signed URLs are deferred)
DROP POLICY IF EXISTS "videos_public_read" ON storage.objects;
CREATE POLICY "videos_public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'videos');

-- Writes only via service role — no insert/update/delete policy for authenticated users
