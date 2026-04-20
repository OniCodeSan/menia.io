-- =====================================================================
-- Tokaro.fans — Content gating: posts metadata readable, media gated
-- =====================================================================
-- Problem: current RLS hides entire rows for subscriber/premium posts,
-- but the UI needs to show blurred thumbnails + lock icons.
-- Actual media files are protected by Supabase Storage bucket policies.
-- =====================================================================

DROP POLICY IF EXISTS "posts_select_gated" ON public.posts;
DROP POLICY IF EXISTS "posts_select_published" ON public.posts;

CREATE POLICY "posts_select_published" ON public.posts
  FOR SELECT USING (true);
