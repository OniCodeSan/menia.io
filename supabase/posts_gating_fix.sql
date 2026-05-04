-- =====================================================================
-- Posts gating fix
-- Drops the redundant `posts_select_published` policy (was permissive: true)
-- and extends `posts_select_gated` to also honour per-post unlocks recorded
-- in `content_unlocks`.
-- Safe to run multiple times.
-- =====================================================================

DROP POLICY IF EXISTS "posts_select_published" ON public.posts;
DROP POLICY IF EXISTS "posts_select_all" ON public.posts;

DROP POLICY IF EXISTS "posts_select_gated" ON public.posts;
CREATE POLICY "posts_select_gated" ON public.posts
  FOR SELECT USING (
    CASE access
      WHEN 'public' THEN true
      WHEN 'subscribers' THEN (
        creator_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.subscriptions s
          WHERE s.fan_id = auth.uid()
            AND s.creator_id = posts.creator_id
            AND s.status = 'active'
            AND (s.expires_at IS NULL OR s.expires_at > now())
        )
        OR EXISTS (
          SELECT 1 FROM public.content_unlocks u
          WHERE u.fan_id = auth.uid() AND u.post_id = posts.id
        )
      )
      WHEN 'premium' THEN (
        creator_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.subscriptions s
          WHERE s.fan_id = auth.uid()
            AND s.creator_id = posts.creator_id
            AND s.tier = 'premium'
            AND s.status = 'active'
            AND (s.expires_at IS NULL OR s.expires_at > now())
        )
        OR EXISTS (
          SELECT 1 FROM public.content_unlocks u
          WHERE u.fan_id = auth.uid() AND u.post_id = posts.id
        )
      )
      ELSE creator_id = auth.uid()
    END
  );
