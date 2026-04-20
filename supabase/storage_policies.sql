-- =====================================================================
-- Storage bucket policies: protect premium media
-- =====================================================================

-- Make media bucket private (was public)
UPDATE storage.buckets SET public = false WHERE id = 'media';

-- Create a public bucket for avatars/covers (always accessible)
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Avatars: anyone can read, owner can write
DROP POLICY IF EXISTS "avatars_public_read" ON storage.objects;
CREATE POLICY "avatars_public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "avatars_owner_insert" ON storage.objects;
CREATE POLICY "avatars_owner_insert" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "avatars_owner_update" ON storage.objects;
CREATE POLICY "avatars_owner_update" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Media bucket: authenticated users can read (signed URLs handle gating)
DROP POLICY IF EXISTS "media_public_read" ON storage.objects;
CREATE POLICY "media_authenticated_read" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'media'
    AND auth.role() = 'authenticated'
  );
