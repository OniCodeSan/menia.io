-- =====================================================================
-- Posts: revert to permissive SELECT (all auth users can see metadata),
-- delegate media gating to the application layer + storage RLS.
-- The frontend strips media_url/media_path for posts the user can't access
-- before generating signed URLs, so the media stays private.
-- =====================================================================

DROP POLICY IF EXISTS "posts_select_gated" ON public.posts;
DROP POLICY IF EXISTS "posts_select_published" ON public.posts;
DROP POLICY IF EXISTS "posts_select_all" ON public.posts;

CREATE POLICY "posts_select_metadata" ON public.posts
  FOR SELECT USING (true);
