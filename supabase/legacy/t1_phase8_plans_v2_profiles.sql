-- =====================================================================
-- Phase 8 — Pricing v2 + creator profile media
-- - New plan tiers/limits/prices
-- - features column for marketing copy
-- - cover_image / profile_image / channel_name on creator_profiles
-- =====================================================================

-- 1. Plans schema — add `features` and rename analytics_level to support
--    0=basic, 1=growth, 2=advanced, 3=full as a numeric tier
ALTER TABLE public.creator_plans
  ADD COLUMN IF NOT EXISTS features text NOT NULL DEFAULT 'basic';

ALTER TABLE public.creator_plans
  ADD COLUMN IF NOT EXISTS analytics_tier integer NOT NULL DEFAULT 0;

-- 2. Update plan rows with the new pricing/limits
-- max_courses / max_live_per_month: NULL means unlimited (existing convention)
UPDATE public.creator_plans SET
  price_monthly = 0.00,
  max_courses = 1,
  max_live_per_month = 1,
  analytics_level = 'none',
  analytics_tier = 0,
  features = 'basic',
  priority_visibility = 0,
  support_level = 'community',
  position = 1
WHERE id = 'free';

UPDATE public.creator_plans SET
  name = 'Starter',
  price_monthly = 19.00,
  max_courses = 5,
  max_live_per_month = 3,
  analytics_level = 'basic',
  analytics_tier = 1,
  features = 'growth',
  priority_visibility = 10,
  support_level = 'email',
  position = 2
WHERE id = 'starter';

UPDATE public.creator_plans SET
  name = 'Pro',
  price_monthly = 39.00,
  max_courses = 20,
  max_live_per_month = 10,
  analytics_level = 'advanced',
  analytics_tier = 2,
  features = 'advanced',
  priority_visibility = 25,
  support_level = 'priority',
  position = 3
WHERE id = 'pro';

UPDATE public.creator_plans SET
  name = 'Elite',
  price_monthly = 60.00,
  max_courses = NULL,        -- unlimited
  max_live_per_month = NULL, -- unlimited
  analytics_level = 'full',
  analytics_tier = 3,
  features = 'full',
  priority_visibility = 50,
  support_level = 'priority',
  position = 4
WHERE id = 'elite';

-- 3. Creator profile media columns
ALTER TABLE public.creator_profiles
  ADD COLUMN IF NOT EXISTS profile_image_url text,
  ADD COLUMN IF NOT EXISTS cover_image_url text,
  ADD COLUMN IF NOT EXISTS channel_name text;

-- 4. Storage bucket for images (separate from videos to scope policies)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'images',
  'images',
  true,
  5242880,  -- 5MB
  ARRAY['image/jpeg','image/png','image/webp','image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "images_public_read" ON storage.objects;
CREATE POLICY "images_public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'images');

-- 5. RPC for plan-limit checks (used by server before INSERT to courses/live_events)
CREATE OR REPLACE FUNCTION public.check_plan_limit(
  p_creator_id uuid,
  p_kind text  -- 'courses' | 'live'
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_plan_id text;
  v_limit integer;
  v_current integer;
BEGIN
  -- Active plan id (defaults to 'free' if none)
  SELECT plan_id INTO v_plan_id
  FROM creator_plan_subscriptions
  WHERE creator_id = p_creator_id
    AND status = 'active'
    AND (expires_at IS NULL OR expires_at > now())
  LIMIT 1;
  v_plan_id := COALESCE(v_plan_id, 'free');

  IF p_kind = 'courses' THEN
    SELECT max_courses INTO v_limit FROM creator_plans WHERE id = v_plan_id;
    SELECT count(*) INTO v_current FROM courses WHERE creator_id = p_creator_id;
  ELSIF p_kind = 'live' THEN
    SELECT max_live_per_month INTO v_limit FROM creator_plans WHERE id = v_plan_id;
    -- Count live events created in current month (rolling 30 days)
    SELECT count(*) INTO v_current FROM live_events
      WHERE creator_id = p_creator_id
        AND created_at > now() - interval '30 days';
  ELSE
    RETURN jsonb_build_object('ok', true);
  END IF;

  -- NULL = unlimited
  IF v_limit IS NULL THEN
    RETURN jsonb_build_object('ok', true, 'plan', v_plan_id, 'limit', null, 'current', v_current);
  END IF;

  RETURN jsonb_build_object(
    'ok', v_current < v_limit,
    'plan', v_plan_id,
    'limit', v_limit,
    'current', v_current
  );
END;
$$;
