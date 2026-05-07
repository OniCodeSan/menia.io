-- =====================================================================
-- TOKARO T1 SAFE REFACTOR — Phase 1: Database
--
-- Goal: pivot from token/creator-monetization platform to T1-compliant
-- education platform (Stripe/Mollie/PayPal safe).
--
-- Strategy:
--   - ARCHIVE financial tables (rename to _archived_*) for audit trail
--   - DROP token system tables (no useful state to preserve)
--   - MIGRATE posts → community_posts, live_sessions → live_events
--   - CREATE new tables: creator_profiles, courses, course_lessons,
--     course_access, live_events, live_access, community_posts
--   - DROP token RPCs and helpers
--   - SIMPLIFY profiles, subscriptions, direct_messages
--
-- Wrapped in BEGIN/COMMIT — atomic. If any step fails, nothing applies.
-- =====================================================================

BEGIN;

-- =====================================================================
-- 1. ARCHIVE FINANCIAL TABLES (preserve audit trail)
-- =====================================================================

ALTER TABLE IF EXISTS public.token_transactions RENAME TO _archived_token_transactions;
ALTER TABLE IF EXISTS public.payout_requests    RENAME TO _archived_payout_requests;
ALTER TABLE IF EXISTS public.webhook_events     RENAME TO _archived_webhook_events;
ALTER TABLE IF EXISTS public.financial_logs     RENAME TO _archived_financial_logs;
ALTER TABLE IF EXISTS public.fraud_logs         RENAME TO _archived_fraud_logs;
ALTER TABLE IF EXISTS public.payment_orders     RENAME TO _archived_payment_orders;

-- Disable RLS on archived tables — admin-only access via service_role
ALTER TABLE IF EXISTS public._archived_token_transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public._archived_payout_requests    DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public._archived_webhook_events     DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public._archived_financial_logs     DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public._archived_fraud_logs         DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public._archived_payment_orders     DISABLE ROW LEVEL SECURITY;

-- =====================================================================
-- 2. CREATE NEW TABLES (before migrations need targets)
-- =====================================================================

-- creator_profiles — extra fields for creators, complementing public.profiles
CREATE TABLE IF NOT EXISTS public.creator_profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  bio text,
  external_payment_link text,
  stripe_account_id text,
  monthly_subscription_price numeric DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  cover_url text,
  price numeric NOT NULL DEFAULT 0,
  external_payment_link text,
  is_published boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS courses_creator_idx ON public.courses(creator_id);
CREATE INDEX IF NOT EXISTS courses_published_idx ON public.courses(is_published) WHERE is_published = true;

CREATE TABLE IF NOT EXISTS public.course_lessons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  title text NOT NULL,
  body text,
  media_url text,
  media_path text,
  position integer NOT NULL DEFAULT 0,
  is_preview boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS course_lessons_course_idx ON public.course_lessons(course_id, position);

CREATE TABLE IF NOT EXISTS public.course_access (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  granted_at timestamptz NOT NULL DEFAULT now(),
  granted_by uuid REFERENCES auth.users(id),
  source text NOT NULL DEFAULT 'manual' CHECK (source IN ('manual','webhook','external_payment')),
  external_reference text,
  PRIMARY KEY (user_id, course_id)
);
CREATE INDEX IF NOT EXISTS course_access_course_idx ON public.course_access(course_id);

CREATE TABLE IF NOT EXISTS public.live_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  cover_url text,
  scheduled_at timestamptz,
  duration_minutes integer,
  price numeric NOT NULL DEFAULT 0,
  external_payment_link text,
  is_published boolean NOT NULL DEFAULT false,
  recording_url text,
  status text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled','live','ended','cancelled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS live_events_creator_idx ON public.live_events(creator_id, scheduled_at DESC);
CREATE INDEX IF NOT EXISTS live_events_published_idx ON public.live_events(is_published, scheduled_at DESC) WHERE is_published = true;

CREATE TABLE IF NOT EXISTS public.live_access (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  live_event_id uuid NOT NULL REFERENCES public.live_events(id) ON DELETE CASCADE,
  granted_at timestamptz NOT NULL DEFAULT now(),
  granted_by uuid REFERENCES auth.users(id),
  source text NOT NULL DEFAULT 'manual' CHECK (source IN ('manual','webhook','external_payment')),
  external_reference text,
  PRIMARY KEY (user_id, live_event_id)
);

CREATE TABLE IF NOT EXISTS public.community_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text,
  body text,
  media_url text,
  media_path text,
  is_subscribers_only boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS community_posts_creator_idx ON public.community_posts(creator_id, created_at DESC);

-- =====================================================================
-- 3. MIGRATE EXISTING DATA
-- =====================================================================

-- 3a. Seed creator_profiles for existing creators
INSERT INTO public.creator_profiles (user_id, bio)
SELECT id, bio FROM public.profiles WHERE role = 'creator'
ON CONFLICT (user_id) DO NOTHING;

-- 3b. Migrate posts → community_posts (every post becomes a community post)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='posts') THEN
    INSERT INTO public.community_posts (id, creator_id, title, body, media_url, media_path, is_subscribers_only, created_at, updated_at)
    SELECT id, creator_id, title, description, media_url, media_path,
           (access IS NOT NULL AND access != 'public') AS is_subscribers_only,
           created_at, COALESCE(updated_at, created_at)
    FROM public.posts
    ON CONFLICT (id) DO NOTHING;
  END IF;
END $$;

-- 3c. Migrate live_sessions → live_events
-- Note: live_sessions has only `started_at` (NOT NULL), no separate created_at.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='live_sessions') THEN
    INSERT INTO public.live_events (id, creator_id, title, scheduled_at, price, is_published, status, created_at)
    SELECT
      id,
      creator_id,
      COALESCE(title, 'Live'),
      started_at,
      0,
      true,
      CASE
        WHEN ended_at IS NOT NULL THEN 'ended'
        WHEN started_at <= now() THEN 'live'
        ELSE 'scheduled'
      END,
      started_at
    FROM public.live_sessions
    ON CONFLICT (id) DO NOTHING;
  END IF;
END $$;

-- =====================================================================
-- 4. DROP TOKEN-RELATED FUNCTIONS (must come before tables they reference)
-- =====================================================================

DROP FUNCTION IF EXISTS public.rpc_subscribe                        CASCADE;
DROP FUNCTION IF EXISTS public.rpc_unlock_content                   CASCADE;
DROP FUNCTION IF EXISTS public.rpc_paid_message                     CASCADE;
DROP FUNCTION IF EXISTS public.rpc_donate                           CASCADE;
DROP FUNCTION IF EXISTS public.rpc_live_access                      CASCADE;
DROP FUNCTION IF EXISTS public.rpc_redeem_invite_code               CASCADE;
DROP FUNCTION IF EXISTS public.admin_generate_invite_codes          CASCADE;
DROP FUNCTION IF EXISTS public.wallet_spend                         CASCADE;
DROP FUNCTION IF EXISTS public.wallet_topup                         CASCADE;
DROP FUNCTION IF EXISTS public.wallet_credit_creator                CASCADE;
DROP FUNCTION IF EXISTS public.wallet_request_payout                CASCADE;
DROP FUNCTION IF EXISTS public.wallet_refund_payout                 CASCADE;
DROP FUNCTION IF EXISTS public._credit_platform                     CASCADE;
DROP FUNCTION IF EXISTS public._credit_creator_with_hold            CASCADE;
DROP FUNCTION IF EXISTS public._log_fraud                           CASCADE;
DROP FUNCTION IF EXISTS public._log_behavior                        CASCADE;
DROP FUNCTION IF EXISTS public.mconfig                              CASCADE;
DROP FUNCTION IF EXISTS public._grant_creator_welcome               CASCADE;
DROP FUNCTION IF EXISTS public._grant_creator_welcome_on_role_change CASCADE;
DROP FUNCTION IF EXISTS public.cron_revert_expired_premium          CASCADE;
DROP FUNCTION IF EXISTS public.get_available_balance                CASCADE;
DROP FUNCTION IF EXISTS public.srv_confirm_token_purchase           CASCADE;
DROP FUNCTION IF EXISTS public.srv_confirm_plan_purchase            CASCADE;
DROP FUNCTION IF EXISTS public.srv_fail_payment_order               CASCADE;
DROP FUNCTION IF EXISTS public.increment_live_donations             CASCADE;

-- Old triggers on profiles
DROP TRIGGER IF EXISTS profiles_grant_creator_welcome ON public.profiles;
DROP TRIGGER IF EXISTS profiles_grant_creator_welcome_on_role_change ON public.profiles;

-- =====================================================================
-- 6. DROP TOKEN/PRODUCT TABLES
-- =====================================================================

DROP TABLE IF EXISTS public.token_wallets         CASCADE;
DROP TABLE IF EXISTS public.token_packs           CASCADE;
DROP TABLE IF EXISTS public.monetization_config   CASCADE;

-- Beta-specific token tables (introduced 2026-04-27, never went live)
DROP TABLE IF EXISTS public.invite_codes          CASCADE;
DROP TABLE IF EXISTS public.conversation_unlocks  CASCADE;
DROP TABLE IF EXISTS public.welcome_bonus_log     CASCADE;
DROP TABLE IF EXISTS public.user_behavior_log     CASCADE;

-- Token-coupled feature tables
DROP TABLE IF EXISTS public.content_unlocks       CASCADE;
DROP TABLE IF EXISTS public.live_donations        CASCADE;

-- Old engagement tables — drop, will rebuild for community_posts later
DROP TABLE IF EXISTS public.post_likes            CASCADE;
DROP TABLE IF EXISTS public.post_comments         CASCADE;
DROP TABLE IF EXISTS public.reshares              CASCADE;
DROP TABLE IF EXISTS public.comment_replies       CASCADE;

-- Old posts/live (data already migrated above)
DROP TABLE IF EXISTS public.posts                 CASCADE;
DROP TABLE IF EXISTS public.live_sessions         CASCADE;
DROP TABLE IF EXISTS public.live_chat_messages    CASCADE;

-- =====================================================================
-- 7. SIMPLIFY EXISTING TABLES (after dependent policies are gone)
-- =====================================================================

-- 7a. profiles: drop token-related columns (uses CASCADE to remove any
-- residual dependent constraints/policies — most were eliminated when
-- their parent tables were dropped above)
ALTER TABLE public.profiles DROP COLUMN IF EXISTS plan          CASCADE;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS premium_until CASCADE;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS payout_method CASCADE;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS monthly_price CASCADE;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS yearly_price  CASCADE;

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_plan_check;

-- 7b. subscriptions: drop tier (single-tier monthly)
ALTER TABLE public.subscriptions DROP COLUMN IF EXISTS tier CASCADE;

-- 7c. direct_messages: drop cost
ALTER TABLE public.direct_messages DROP COLUMN IF EXISTS cost CASCADE;

-- =====================================================================
-- 8. RLS POLICIES FOR NEW TABLES
-- =====================================================================

-- creator_profiles: public read, owner write
ALTER TABLE public.creator_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "creator_profiles_select_all" ON public.creator_profiles;
CREATE POLICY "creator_profiles_select_all" ON public.creator_profiles FOR SELECT USING (true);
DROP POLICY IF EXISTS "creator_profiles_owner_modify" ON public.creator_profiles;
CREATE POLICY "creator_profiles_owner_modify" ON public.creator_profiles
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- courses: public read if published, owner read+write
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "courses_select_published" ON public.courses;
CREATE POLICY "courses_select_published" ON public.courses
  FOR SELECT USING (is_published = true OR creator_id = auth.uid());
DROP POLICY IF EXISTS "courses_owner_modify" ON public.courses;
CREATE POLICY "courses_owner_modify" ON public.courses
  FOR ALL USING (auth.uid() = creator_id) WITH CHECK (auth.uid() = creator_id);

-- course_lessons: preview lessons readable by all; full lessons require course_access or ownership
ALTER TABLE public.course_lessons ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "course_lessons_select_gated" ON public.course_lessons;
CREATE POLICY "course_lessons_select_gated" ON public.course_lessons
  FOR SELECT USING (
    is_preview = true
    OR EXISTS (SELECT 1 FROM public.courses c WHERE c.id = course_id AND c.creator_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.course_access ca WHERE ca.course_id = course_id AND ca.user_id = auth.uid())
  );
DROP POLICY IF EXISTS "course_lessons_owner_modify" ON public.course_lessons;
CREATE POLICY "course_lessons_owner_modify" ON public.course_lessons
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.courses c WHERE c.id = course_id AND c.creator_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM public.courses c WHERE c.id = course_id AND c.creator_id = auth.uid())
  );

-- course_access: user sees own access; creator sees who has access to their courses; writes via service_role only
ALTER TABLE public.course_access ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "course_access_select_self_or_creator" ON public.course_access;
CREATE POLICY "course_access_select_self_or_creator" ON public.course_access
  FOR SELECT USING (
    auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM public.courses c WHERE c.id = course_id AND c.creator_id = auth.uid())
  );

-- live_events: public read if published, owner full
ALTER TABLE public.live_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "live_events_select_published" ON public.live_events;
CREATE POLICY "live_events_select_published" ON public.live_events
  FOR SELECT USING (is_published = true OR creator_id = auth.uid());
DROP POLICY IF EXISTS "live_events_owner_modify" ON public.live_events;
CREATE POLICY "live_events_owner_modify" ON public.live_events
  FOR ALL USING (auth.uid() = creator_id) WITH CHECK (auth.uid() = creator_id);

-- live_access: same pattern as course_access
ALTER TABLE public.live_access ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "live_access_select_self_or_creator" ON public.live_access;
CREATE POLICY "live_access_select_self_or_creator" ON public.live_access
  FOR SELECT USING (
    auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM public.live_events e WHERE e.id = live_event_id AND e.creator_id = auth.uid())
  );

-- community_posts: public unless subscribers-only; gated by active subscription
ALTER TABLE public.community_posts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "community_posts_select_gated" ON public.community_posts;
CREATE POLICY "community_posts_select_gated" ON public.community_posts
  FOR SELECT USING (
    is_subscribers_only = false
    OR creator_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.subscriptions s
      WHERE s.fan_id = auth.uid()
        AND s.creator_id = community_posts.creator_id
        AND s.status = 'active'
        AND (s.expires_at IS NULL OR s.expires_at > now())
    )
  );
DROP POLICY IF EXISTS "community_posts_owner_modify" ON public.community_posts;
CREATE POLICY "community_posts_owner_modify" ON public.community_posts
  FOR ALL USING (auth.uid() = creator_id) WITH CHECK (auth.uid() = creator_id);

COMMIT;

-- =====================================================================
-- ROLLBACK NOTE
-- =====================================================================
-- This migration is destructive on the token system. To revert:
--   1. Restore archived tables: ALTER TABLE _archived_X RENAME TO X
--   2. Drop new tables: courses, course_lessons, course_access,
--      live_events, live_access, community_posts, creator_profiles
--   3. Re-run beta_launch.sql + monetization_*.sql + atomic_*.sql
-- Audit data in _archived_* survives any future T1 → T2 reverse pivot.
