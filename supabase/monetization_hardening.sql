-- =====================================================================
-- Monetization Hardening — RLS plan enforcement
-- Prevents live_sessions creation unless creator plan = 'pro'
-- Prevents posts with access != 'public' unless creator plan in ('start','pro')
-- Safe to run multiple times (idempotent).
-- =====================================================================

-- 1. Replace live_sessions INSERT policy: only pro creators
DROP POLICY IF EXISTS "live_sessions_insert" ON public.live_sessions;
CREATE POLICY "live_sessions_insert" ON public.live_sessions
  FOR INSERT WITH CHECK (
    auth.uid() = creator_id
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND plan = 'pro'
    )
  );

-- 2. Replace posts INSERT policy: public posts allowed for any creator,
--    non-public posts require plan start or pro
DROP POLICY IF EXISTS "posts_insert_own" ON public.posts;
CREATE POLICY "posts_insert_own" ON public.posts
  FOR INSERT WITH CHECK (
    auth.uid() = creator_id
    AND (
      access = 'public'
      OR EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND plan IN ('start', 'pro')
      )
    )
  );

-- 3. Prevent updating a post to non-public access without correct plan
DROP POLICY IF EXISTS "posts_update_own" ON public.posts;
CREATE POLICY "posts_update_own" ON public.posts
  FOR UPDATE USING (auth.uid() = creator_id)
  WITH CHECK (
    auth.uid() = creator_id
    AND (
      access = 'public'
      OR EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND plan IN ('start', 'pro')
      )
    )
  );
