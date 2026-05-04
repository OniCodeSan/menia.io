-- =====================================================================
-- TOKARO T1 — Phase 4: KPI + Segments + Creator Plans
--
-- Aim: give creators monetisation/visibility levers without introducing
-- internal money (no balances, no payouts, no token economy).
-- All KPIs are *estimated* from access_logs, not from real transactions.
-- =====================================================================

BEGIN;

-- =====================================================================
-- 1. ACCESS_LOGS — immutable audit trail of every grant
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.access_logs (
  id bigserial PRIMARY KEY,
  creator_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content_type text NOT NULL CHECK (content_type IN ('course','live','subscription')),
  content_id uuid NOT NULL,
  source text NOT NULL DEFAULT 'manual',
  estimated_amount numeric(10,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS access_logs_creator_idx ON public.access_logs(creator_id, created_at DESC);
CREATE INDEX IF NOT EXISTS access_logs_user_idx ON public.access_logs(user_id);
CREATE INDEX IF NOT EXISTS access_logs_date_idx ON public.access_logs(created_at);

ALTER TABLE public.access_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "access_logs_select_own_or_admin" ON public.access_logs;
CREATE POLICY "access_logs_select_own_or_admin" ON public.access_logs
  FOR SELECT USING (
    auth.uid() = creator_id
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- =====================================================================
-- 2. CREATOR_KPI_DAILY — daily snapshots
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.creator_kpi_daily (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date date NOT NULL,
  profile_views integer NOT NULL DEFAULT 0,
  course_views integer NOT NULL DEFAULT 0,
  live_views integer NOT NULL DEFAULT 0,
  community_views integer NOT NULL DEFAULT 0,
  new_followers integer NOT NULL DEFAULT 0,
  new_students integer NOT NULL DEFAULT 0,
  estimated_revenue numeric(12,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (creator_id, date)
);
CREATE INDEX IF NOT EXISTS creator_kpi_daily_creator_idx ON public.creator_kpi_daily(creator_id, date DESC);

ALTER TABLE public.creator_kpi_daily ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "kpi_daily_own_or_admin" ON public.creator_kpi_daily;
CREATE POLICY "kpi_daily_own_or_admin" ON public.creator_kpi_daily
  FOR SELECT USING (
    auth.uid() = creator_id
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- =====================================================================
-- 3. CREATOR_KPI_AGGREGATED — rolling totals, used for ranking
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.creator_kpi_aggregated (
  creator_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  total_courses integer NOT NULL DEFAULT 0,
  total_students integer NOT NULL DEFAULT 0,
  total_live_attendees integer NOT NULL DEFAULT 0,
  total_revenue_estimated numeric(12,2) NOT NULL DEFAULT 0,
  conversion_rate_estimated numeric(5,4) NOT NULL DEFAULT 0,
  visibility_score integer NOT NULL DEFAULT 0,
  last_updated timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS creator_kpi_agg_visibility_idx ON public.creator_kpi_aggregated(visibility_score DESC);

ALTER TABLE public.creator_kpi_aggregated ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "kpi_agg_select_all" ON public.creator_kpi_aggregated;
CREATE POLICY "kpi_agg_select_all" ON public.creator_kpi_aggregated FOR SELECT USING (true);

-- =====================================================================
-- 4. CREATOR_SEGMENTS
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.creator_segments (
  creator_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  segment_type text NOT NULL DEFAULT 'starter' CHECK (segment_type IN ('starter','growing','pro','elite')),
  score integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.creator_segments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "segments_select_all" ON public.creator_segments;
CREATE POLICY "segments_select_all" ON public.creator_segments FOR SELECT USING (true);

-- =====================================================================
-- 5. CREATOR_PLANS — the plan catalog (Tokaro charges creators via external link)
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.creator_plans (
  id text PRIMARY KEY,
  name text NOT NULL,
  price_monthly numeric(10,2) NOT NULL DEFAULT 0,
  external_payment_link text,
  max_courses integer,
  max_live_per_month integer,
  analytics_level text NOT NULL DEFAULT 'none'
    CHECK (analytics_level IN ('none','basic','advanced','full')),
  priority_visibility integer NOT NULL DEFAULT 0,
  support_level text NOT NULL DEFAULT 'community'
    CHECK (support_level IN ('community','email','priority')),
  is_active boolean NOT NULL DEFAULT true,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.creator_plans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "plans_select_all" ON public.creator_plans;
CREATE POLICY "plans_select_all" ON public.creator_plans FOR SELECT USING (is_active = true);

INSERT INTO public.creator_plans (id, name, price_monthly, max_courses, max_live_per_month, analytics_level, priority_visibility, support_level, position) VALUES
  ('free',    'Free',    0.00,  1,    1,    'none',     0,  'community', 1),
  ('starter', 'Starter', 19.00, NULL, 4,    'basic',    10, 'email',     2),
  ('pro',     'Pro',     29.00, NULL, NULL, 'advanced', 25, 'email',     3),
  ('elite',   'Elite',   49.00, NULL, NULL, 'full',     50, 'priority',  4)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  price_monthly = EXCLUDED.price_monthly,
  max_courses = EXCLUDED.max_courses,
  max_live_per_month = EXCLUDED.max_live_per_month,
  analytics_level = EXCLUDED.analytics_level,
  priority_visibility = EXCLUDED.priority_visibility,
  support_level = EXCLUDED.support_level,
  position = EXCLUDED.position;

-- =====================================================================
-- 6. CREATOR_PLAN_SUBSCRIPTIONS
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.creator_plan_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id text NOT NULL REFERENCES public.creator_plans(id),
  started_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','cancelled','expired')),
  external_reference text,
  granted_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
-- Only one active plan per creator
CREATE UNIQUE INDEX IF NOT EXISTS creator_plan_subs_active_unique
  ON public.creator_plan_subscriptions(creator_id) WHERE status = 'active';

ALTER TABLE public.creator_plan_subscriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "creator_plan_subs_select_own_or_admin" ON public.creator_plan_subscriptions;
CREATE POLICY "creator_plan_subs_select_own_or_admin" ON public.creator_plan_subscriptions
  FOR SELECT USING (
    auth.uid() = creator_id
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- =====================================================================
-- 7. ACCESS LOG TRIGGERS — capture every grant on course/live/subscription
-- =====================================================================
CREATE OR REPLACE FUNCTION public._log_access() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_creator_id uuid;
  v_user_id uuid;
  v_amount numeric;
  v_content_type text;
  v_content_id uuid;
  v_source text;
BEGIN
  IF TG_TABLE_NAME = 'course_access' THEN
    v_content_type := 'course';
    v_content_id := NEW.course_id;
    v_user_id := NEW.user_id;
    v_source := COALESCE(NEW.source, 'manual');
    SELECT creator_id, COALESCE(price, 0) INTO v_creator_id, v_amount FROM courses WHERE id = NEW.course_id;
  ELSIF TG_TABLE_NAME = 'live_access' THEN
    v_content_type := 'live';
    v_content_id := NEW.live_event_id;
    v_user_id := NEW.user_id;
    v_source := COALESCE(NEW.source, 'manual');
    SELECT creator_id, COALESCE(price, 0) INTO v_creator_id, v_amount FROM live_events WHERE id = NEW.live_event_id;
  ELSIF TG_TABLE_NAME = 'subscriptions' THEN
    v_content_type := 'subscription';
    v_content_id := NEW.creator_id;
    v_creator_id := NEW.creator_id;
    v_user_id := NEW.fan_id;
    v_source := 'manual';
    SELECT COALESCE(monthly_subscription_price, 0) INTO v_amount
      FROM creator_profiles WHERE user_id = NEW.creator_id;
  ELSE
    RETURN NEW;
  END IF;

  IF v_creator_id IS NOT NULL AND v_user_id IS NOT NULL THEN
    INSERT INTO access_logs (creator_id, user_id, content_type, content_id, source, estimated_amount)
    VALUES (v_creator_id, v_user_id, v_content_type, v_content_id, v_source, COALESCE(v_amount, 0));
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS course_access_log_trg ON public.course_access;
CREATE TRIGGER course_access_log_trg AFTER INSERT ON public.course_access
  FOR EACH ROW EXECUTE FUNCTION public._log_access();

DROP TRIGGER IF EXISTS live_access_log_trg ON public.live_access;
CREATE TRIGGER live_access_log_trg AFTER INSERT ON public.live_access
  FOR EACH ROW EXECUTE FUNCTION public._log_access();

DROP TRIGGER IF EXISTS subscriptions_access_log_trg ON public.subscriptions;
CREATE TRIGGER subscriptions_access_log_trg AFTER INSERT ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public._log_access();

-- =====================================================================
-- 8. KPI COMPUTATION FUNCTION (called by cron)
-- =====================================================================
CREATE OR REPLACE FUNCTION public.compute_creator_kpi(p_creator_id uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_courses integer;
  v_students integer;
  v_attendees integer;
  v_revenue numeric;
  v_conversion numeric;
  v_score integer;
  v_segment text;
  v_visibility integer;
  v_plan_boost integer;
  v_recent_activity integer;
  v_segment_weight integer;
BEGIN
  SELECT count(*) INTO v_courses FROM courses
    WHERE creator_id = p_creator_id AND is_published = true;

  SELECT count(DISTINCT user_id) INTO v_students FROM access_logs
    WHERE creator_id = p_creator_id AND content_type = 'course';

  SELECT count(*) INTO v_attendees FROM access_logs
    WHERE creator_id = p_creator_id AND content_type = 'live';

  SELECT COALESCE(sum(estimated_amount), 0) INTO v_revenue FROM access_logs
    WHERE creator_id = p_creator_id;

  -- Conversion proxy: students / max(profile_views, 1).
  -- Profile views aren't tracked yet, so use a proxy of (students / (courses*10))
  -- clamped between 0 and 1. This keeps the KPI present until view tracking ships.
  v_conversion := CASE
    WHEN v_courses > 0 THEN LEAST(GREATEST(v_students::numeric / GREATEST(v_courses * 10, 1)::numeric, 0), 1)
    ELSE 0
  END;

  -- Recent activity: courses or live created in the last 30 days
  SELECT count(*) INTO v_recent_activity FROM (
    SELECT 1 FROM courses WHERE creator_id = p_creator_id AND created_at > now() - interval '30 days'
    UNION ALL
    SELECT 1 FROM live_events WHERE creator_id = p_creator_id AND created_at > now() - interval '30 days'
  ) x;

  v_score := (v_students * 2)
           + (v_courses * 5)
           + (v_conversion * 100)::integer
           + (v_recent_activity * 10);

  v_segment := CASE
    WHEN v_score >= 500 THEN 'elite'
    WHEN v_score >= 200 THEN 'pro'
    WHEN v_score >=  50 THEN 'growing'
    ELSE 'starter'
  END;

  v_segment_weight := CASE v_segment
    WHEN 'elite'   THEN 50
    WHEN 'pro'     THEN 25
    WHEN 'growing' THEN 10
    ELSE 0
  END;

  SELECT COALESCE(p.priority_visibility, 0) INTO v_plan_boost
    FROM creator_plan_subscriptions ps
    JOIN creator_plans p ON p.id = ps.plan_id
    WHERE ps.creator_id = p_creator_id
      AND ps.status = 'active'
      AND (ps.expires_at IS NULL OR ps.expires_at > now())
    LIMIT 1;
  v_plan_boost := COALESCE(v_plan_boost, 0);

  v_visibility := v_segment_weight
                + v_recent_activity
                + v_plan_boost
                + (v_conversion * 50)::integer;

  INSERT INTO creator_kpi_aggregated (
    creator_id, total_courses, total_students, total_live_attendees,
    total_revenue_estimated, conversion_rate_estimated, visibility_score, last_updated
  ) VALUES (
    p_creator_id, v_courses, v_students, v_attendees,
    v_revenue, v_conversion, v_visibility, now()
  )
  ON CONFLICT (creator_id) DO UPDATE SET
    total_courses = EXCLUDED.total_courses,
    total_students = EXCLUDED.total_students,
    total_live_attendees = EXCLUDED.total_live_attendees,
    total_revenue_estimated = EXCLUDED.total_revenue_estimated,
    conversion_rate_estimated = EXCLUDED.conversion_rate_estimated,
    visibility_score = EXCLUDED.visibility_score,
    last_updated = now();

  INSERT INTO creator_segments (creator_id, segment_type, score, updated_at)
  VALUES (p_creator_id, v_segment, v_score, now())
  ON CONFLICT (creator_id) DO UPDATE SET
    segment_type = EXCLUDED.segment_type,
    score = EXCLUDED.score,
    updated_at = now();
END;
$$;

-- =====================================================================
-- 9. CRON JOBS (called by server cron scheduler)
-- =====================================================================
CREATE OR REPLACE FUNCTION public.cron_recompute_all_kpi() RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_count integer := 0;
  r record;
BEGIN
  FOR r IN SELECT id FROM profiles WHERE role = 'creator' LOOP
    PERFORM compute_creator_kpi(r.id);
    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.cron_snapshot_kpi_daily() RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_count integer := 0;
BEGIN
  WITH agg AS (
    SELECT
      creator_id,
      count(DISTINCT user_id) FILTER (WHERE content_type = 'course') AS new_students,
      count(*) FILTER (WHERE content_type = 'live')                  AS live_views,
      COALESCE(sum(estimated_amount), 0)                             AS revenue
    FROM access_logs
    WHERE created_at::date = CURRENT_DATE
    GROUP BY creator_id
  )
  INSERT INTO creator_kpi_daily (creator_id, date, new_students, live_views, estimated_revenue)
  SELECT creator_id, CURRENT_DATE, new_students, live_views, revenue FROM agg
  ON CONFLICT (creator_id, date) DO UPDATE SET
    new_students = EXCLUDED.new_students,
    live_views = EXCLUDED.live_views,
    estimated_revenue = EXCLUDED.estimated_revenue;

  GET DIAGNOSTICS v_count = ROW_COUNT;

  -- Inactivity penalty: creators with no daily activity for 7+ days lose KPI score
  -- (handled implicitly by recompute since recent_activity goes to 0)

  RETURN v_count;
END;
$$;

COMMIT;
