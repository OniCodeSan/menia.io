


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."_log_access"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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


ALTER FUNCTION "public"."_log_access"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_plan_limit"("p_creator_id" "uuid", "p_kind" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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


ALTER FUNCTION "public"."check_plan_limit"("p_creator_id" "uuid", "p_kind" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."compute_creator_kpi"("p_creator_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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


ALTER FUNCTION "public"."compute_creator_kpi"("p_creator_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."confirm_plan_purchase"("p_order_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_order record;
  v_caller_role text;
  v_current_plan text;
BEGIN
  SELECT role INTO v_caller_role FROM profiles WHERE id = auth.uid();
  IF v_caller_role IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'Solo gli admin possono confermare ordini';
  END IF;

  SELECT * INTO v_order FROM payment_orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Ordine non trovato'; END IF;
  IF v_order.order_type != 'creator_plan' THEN RAISE EXCEPTION 'Ordine non è un piano creator'; END IF;
  IF v_order.status = 'succeeded' THEN
    RETURN jsonb_build_object('already_confirmed', true, 'order_id', v_order.id);
  END IF;
  IF v_order.status != 'pending' THEN RAISE EXCEPTION 'Ordine non è in stato pending (stato: %)', v_order.status; END IF;

  -- Get current plan
  SELECT plan INTO v_current_plan FROM profiles WHERE id = v_order.user_id;

  -- Activate plan
  UPDATE profiles
  SET plan = v_order.target_code, updated_at = now()
  WHERE id = v_order.user_id;

  -- Mark order succeeded
  UPDATE payment_orders
  SET status = 'succeeded', confirmed_at = now(), updated_at = now(),
      metadata_json = COALESCE(metadata_json, '{}'::jsonb) || jsonb_build_object('previous_plan', v_current_plan)
  WHERE id = p_order_id;

  RETURN jsonb_build_object('confirmed', true, 'order_id', v_order.id, 'plan', v_order.target_code, 'previous_plan', v_current_plan);
END;
$$;


ALTER FUNCTION "public"."confirm_plan_purchase"("p_order_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."confirm_token_purchase"("p_order_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_order record;
  v_wallet record;
  v_caller_role text;
BEGIN
  SELECT role INTO v_caller_role FROM profiles WHERE id = auth.uid();
  IF v_caller_role IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'Solo gli admin possono confermare ordini';
  END IF;

  SELECT * INTO v_order FROM payment_orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Ordine non trovato'; END IF;
  IF v_order.order_type != 'token_pack' THEN RAISE EXCEPTION 'Ordine non è un token pack'; END IF;
  IF v_order.status = 'succeeded' THEN
    RETURN jsonb_build_object('already_confirmed', true, 'order_id', v_order.id);
  END IF;
  IF v_order.status != 'pending' THEN RAISE EXCEPTION 'Ordine non è in stato pending (stato: %)', v_order.status; END IF;

  -- Credit wallet
  SELECT * INTO v_wallet FROM token_wallets
    WHERE user_id = v_order.user_id AND wallet_type = 'user' FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO token_wallets (user_id, wallet_type, balance, total_earned, total_spent)
    VALUES (v_order.user_id, 'user', v_order.token_amount, v_order.token_amount, 0)
    RETURNING * INTO v_wallet;
  ELSE
    UPDATE token_wallets
    SET balance = balance + v_order.token_amount,
        total_earned = total_earned + v_order.token_amount,
        updated_at = now()
    WHERE id = v_wallet.id;
  END IF;

  -- Ledger entry
  INSERT INTO token_transactions (user_id, wallet_type, type, amount, description, ref_id, ref_type)
  VALUES (v_order.user_id, 'user', 'topup', v_order.token_amount,
          'Acquisto ' || v_order.token_amount || ' Token (€' || v_order.amount_eur || ')',
          v_order.id::text, 'token_purchase');

  -- Mark order succeeded
  UPDATE payment_orders
  SET status = 'succeeded', confirmed_at = now(), updated_at = now()
  WHERE id = p_order_id;

  RETURN jsonb_build_object('confirmed', true, 'order_id', v_order.id, 'tokens', v_order.token_amount);
END;
$$;


ALTER FUNCTION "public"."confirm_token_purchase"("p_order_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cron_cleanup_course_drafts"() RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_deleted integer;
BEGIN
  WITH ranked AS (
    SELECT id, row_number() OVER (PARTITION BY course_id ORDER BY created_at DESC) AS rn
    FROM course_drafts
  ),
  deleted AS (
    DELETE FROM course_drafts
    WHERE id IN (SELECT id FROM ranked WHERE rn > 5)
    RETURNING id
  )
  SELECT count(*) INTO v_deleted FROM deleted;
  RETURN v_deleted;
END;
$$;


ALTER FUNCTION "public"."cron_cleanup_course_drafts"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cron_expire_platform_subscriptions"() RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_count integer := 0;
  v_affected integer;
BEGIN
  UPDATE public.platform_subscriptions
     SET status = 'expired', updated_at = now()
   WHERE status = 'trial' AND trial_end < now();
  GET DIAGNOSTICS v_affected = ROW_COUNT; v_count := v_count + v_affected;

  UPDATE public.platform_subscriptions
     SET status = 'expired', updated_at = now()
   WHERE status IN ('active','past_due')
     AND cancel_at_period_end = true
     AND current_period_end < now();
  GET DIAGNOSTICS v_affected = ROW_COUNT; v_count := v_count + v_affected;

  RETURN v_count;
END $$;


ALTER FUNCTION "public"."cron_expire_platform_subscriptions"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cron_recompute_all_kpi"() RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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


ALTER FUNCTION "public"."cron_recompute_all_kpi"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cron_snapshot_kpi_daily"() RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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


ALTER FUNCTION "public"."cron_snapshot_kpi_daily"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fail_payment_order"("p_order_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_order record;
  v_caller_role text;
BEGIN
  SELECT role INTO v_caller_role FROM profiles WHERE id = auth.uid();
  IF v_caller_role IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'Solo gli admin possono aggiornare ordini';
  END IF;

  SELECT * INTO v_order FROM payment_orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Ordine non trovato'; END IF;
  IF v_order.status = 'failed' THEN
    RETURN jsonb_build_object('already_failed', true, 'order_id', v_order.id);
  END IF;
  IF v_order.status != 'pending' THEN RAISE EXCEPTION 'Ordine non è in stato pending (stato: %)', v_order.status; END IF;

  UPDATE payment_orders
  SET status = 'failed', updated_at = now()
  WHERE id = p_order_id;

  RETURN jsonb_build_object('failed', true, 'order_id', v_order.id);
END;
$$;


ALTER FUNCTION "public"."fail_payment_order"("p_order_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."gdpr_data_retention_cleanup"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  -- login_log: 12 months
  DELETE FROM login_log WHERE created_at < NOW() - INTERVAL '12 months';

  -- consent_log: 12 months
  DELETE FROM consent_log WHERE created_at < NOW() - INTERVAL '12 months';

  -- data_export_requests expired: 30 days after expiry
  DELETE FROM data_export_requests
    WHERE status = 'expired' AND expires_at < NOW() - INTERVAL '30 days';

  -- Mark expired export requests
  UPDATE data_export_requests
    SET status = 'expired'
    WHERE status = 'ready' AND expires_at < NOW();
END;
$$;


ALTER FUNCTION "public"."gdpr_data_retention_cleanup"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."grant_creator_welcome_plan"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- Solo se l'utente diventa creator e non ha mai avuto un abbonamento.
  IF NEW.role = 'creator'
     AND NOT EXISTS (
       SELECT 1 FROM public.creator_plan_subscriptions
       WHERE creator_id = NEW.id
     )
  THEN
    INSERT INTO public.creator_plan_subscriptions (
      creator_id, plan_id, status, started_at, expires_at,
      external_reference, granted_by
    ) VALUES (
      NEW.id,
      'starter',
      'active',
      now(),
      now() + interval '30 days',
      'welcome_gift',
      NEW.id
    );
    -- Ricomputa subito i KPI così visibility_score include il plan_boost.
    PERFORM compute_creator_kpi(NEW.id);
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."grant_creator_welcome_plan"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."grant_platform_trial"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  INSERT INTO public.platform_subscriptions (user_id, status, trial_start, trial_end)
  VALUES (NEW.id, 'trial', now(), now() + interval '30 days')
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END $$;


ALTER FUNCTION "public"."grant_platform_trial"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role, onboarding_complete, date_of_birth, age_verified, age_verified_at)
  VALUES (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1)),
    coalesce(new.raw_user_meta_data->>'role','fan'),
    coalesce((new.raw_user_meta_data->>'role') = 'fan', true),
    CASE WHEN new.raw_user_meta_data->>'date_of_birth' IS NOT NULL
         THEN (new.raw_user_meta_data->>'date_of_birth')::date
         ELSE NULL END,
    CASE WHEN new.raw_user_meta_data->>'date_of_birth' IS NOT NULL THEN true ELSE false END,
    CASE WHEN new.raw_user_meta_data->>'date_of_birth' IS NOT NULL THEN now() ELSE NULL END
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."increment_coupon_usage"("coupon_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
    BEGIN
      UPDATE public.coupons SET used_count = used_count + 1 WHERE id = coupon_id;
    END;
    $$;


ALTER FUNCTION "public"."increment_coupon_usage"("coupon_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_admin"("uid" "uuid" DEFAULT "auth"."uid"()) RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select coalesce(
    (select role = 'admin' from public.profiles where id = uid),
    false
  );
$$;


ALTER FUNCTION "public"."is_admin"("uid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."prevent_dob_update"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF OLD.date_of_birth IS NOT NULL AND NEW.date_of_birth IS DISTINCT FROM OLD.date_of_birth THEN
    RAISE EXCEPTION 'date_of_birth cannot be changed once set';
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."prevent_dob_update"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."protect_role_column"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    NEW.role := OLD.role;
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."protect_role_column"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."purge_old_audit_logs"("retention_days" integer DEFAULT 90) RETURNS TABLE("deleted_rows" bigint)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_deleted BIGINT;
BEGIN
  DELETE FROM public.audit_log
  WHERE created_at < NOW() - (retention_days || ' days')::INTERVAL;

  GET DIAGNOSTICS v_deleted = ROW_COUNT;

  RETURN QUERY SELECT v_deleted;
END;
$$;


ALTER FUNCTION "public"."purge_old_audit_logs"("retention_days" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_create_live_session"("p_title" "text", "p_category" "text" DEFAULT 'general'::"text", "p_sub_only" boolean DEFAULT false, "p_donations_enabled" boolean DEFAULT true, "p_min_donation" integer DEFAULT 2) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_creator_id uuid;
  v_plan text;
  v_role text;
  v_limit integer;
  v_used integer;
  v_month_start timestamptz;
  v_month_end timestamptz;
  v_session record;
BEGIN
  v_creator_id := auth.uid();
  IF v_creator_id IS NULL THEN
    RAISE EXCEPTION 'Non autenticato';
  END IF;

  SELECT COALESCE(plan, 'free'), COALESCE(role, 'fan')
    INTO v_plan, v_role
    FROM profiles
   WHERE id = v_creator_id;

  IF v_role = 'admin' THEN
    v_limit := NULL;
  ELSIF v_plan = 'pro' THEN
    v_limit := NULL;
  ELSIF v_plan = 'start' THEN
    v_limit := 2;
  ELSE
    RAISE EXCEPTION 'Il tuo piano non include le dirette live.';
  END IF;

  IF v_limit IS NOT NULL THEN
    v_month_start := date_trunc('month', now());
    v_month_end := date_trunc('month', now()) + interval '1 month';

    SELECT count(*)::integer INTO v_used
      FROM live_sessions
     WHERE creator_id = v_creator_id
       AND created_at >= v_month_start
       AND created_at < v_month_end;

    IF v_used >= v_limit THEN
      RAISE EXCEPTION 'Hai esaurito le % live mensili del piano %. Passa a PRO per live illimitate.', v_limit, upper(v_plan);
    END IF;
  END IF;

  INSERT INTO live_sessions (creator_id, title, category, sub_only, donations_enabled, min_donation, status)
  VALUES (v_creator_id, p_title, p_category, p_sub_only, p_donations_enabled, p_min_donation, 'live')
  RETURNING * INTO v_session;

  RETURN jsonb_build_object(
    'id', v_session.id,
    'creator_id', v_session.creator_id,
    'title', v_session.title,
    'category', v_session.category,
    'sub_only', v_session.sub_only,
    'donations_enabled', v_session.donations_enabled,
    'min_donation', v_session.min_donation,
    'status', v_session.status,
    'created_at', v_session.created_at
  );
END;
$$;


ALTER FUNCTION "public"."rpc_create_live_session"("p_title" "text", "p_category" "text", "p_sub_only" boolean, "p_donations_enabled" boolean, "p_min_donation" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_email_preferences_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."set_email_preferences_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."touch_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


ALTER FUNCTION "public"."touch_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_post_comments_count"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
begin
  if tg_op = 'INSERT' then
    update public.posts set comments_count = comments_count + 1 where id = new.post_id;
    return new;
  elsif tg_op = 'DELETE' then
    update public.posts set comments_count = greatest(comments_count - 1, 0) where id = old.post_id;
    return old;
  end if;
  return null;
end;
$$;


ALTER FUNCTION "public"."update_post_comments_count"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_post_likes_count"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
begin
  if tg_op = 'INSERT' then
    update public.posts set likes_count = likes_count + 1 where id = new.post_id;
    return new;
  elsif tg_op = 'DELETE' then
    update public.posts set likes_count = greatest(likes_count - 1, 0) where id = old.post_id;
    return old;
  end if;
  return null;
end;
$$;


ALTER FUNCTION "public"."update_post_likes_count"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."_archived_financial_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "action" "text" NOT NULL,
    "actor_id" "uuid",
    "target_id" "uuid",
    "amount_tokens" integer,
    "amount_eur" numeric(10,2),
    "details" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."_archived_financial_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."_archived_fraud_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "event_type" "text" NOT NULL,
    "severity" "text" DEFAULT 'low'::"text" NOT NULL,
    "details" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "resolved" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "fraud_logs_severity_check" CHECK (("severity" = ANY (ARRAY['low'::"text", 'medium'::"text", 'high'::"text", 'critical'::"text"])))
);


ALTER TABLE "public"."_archived_fraud_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."_archived_payment_orders" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "order_type" "text" NOT NULL,
    "target_code" "text" NOT NULL,
    "amount_eur" numeric(10,2) NOT NULL,
    "token_amount" integer,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "provider" "text",
    "provider_reference" "text",
    "metadata_json" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "confirmed_at" timestamp with time zone,
    CONSTRAINT "payment_orders_order_type_check" CHECK (("order_type" = ANY (ARRAY['token_pack'::"text", 'creator_plan'::"text"]))),
    CONSTRAINT "payment_orders_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'succeeded'::"text", 'failed'::"text", 'cancelled'::"text"])))
);


ALTER TABLE "public"."_archived_payment_orders" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."_archived_payout_requests" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "creator_id" "uuid" NOT NULL,
    "token_amount" integer NOT NULL,
    "euro_amount" numeric(10,2) NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "available_at" timestamp with time zone,
    "creator_email" "text",
    CONSTRAINT "payout_requests_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'processing'::"text", 'paid'::"text", 'rejected'::"text"])))
);


ALTER TABLE "public"."_archived_payout_requests" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."_archived_token_transactions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "wallet_type" "text" NOT NULL,
    "type" "text" NOT NULL,
    "amount" integer NOT NULL,
    "description" "text",
    "ref_id" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "ref_type" "text",
    "available_at" timestamp with time zone,
    CONSTRAINT "token_transactions_type_check" CHECK (("type" = ANY (ARRAY['topup'::"text", 'spend'::"text", 'earn'::"text", 'refund'::"text", 'payout'::"text"]))),
    CONSTRAINT "token_transactions_wallet_type_check" CHECK (("wallet_type" = ANY (ARRAY['user'::"text", 'creator'::"text"])))
);


ALTER TABLE "public"."_archived_token_transactions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."_archived_webhook_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "provider" "text" NOT NULL,
    "event_type" "text" NOT NULL,
    "event_id" "text",
    "payload" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "status" "text" DEFAULT 'received'::"text" NOT NULL,
    "error_message" "text",
    "order_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "processed_at" timestamp with time zone,
    CONSTRAINT "webhook_events_status_check" CHECK (("status" = ANY (ARRAY['received'::"text", 'processed'::"text", 'failed'::"text", 'ignored'::"text"])))
);


ALTER TABLE "public"."_archived_webhook_events" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."access_logs" (
    "id" bigint NOT NULL,
    "creator_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "content_type" "text" NOT NULL,
    "content_id" "uuid" NOT NULL,
    "source" "text" DEFAULT 'manual'::"text" NOT NULL,
    "estimated_amount" numeric(10,2) DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "access_logs_content_type_check" CHECK (("content_type" = ANY (ARRAY['course'::"text", 'live'::"text", 'subscription'::"text"])))
);


ALTER TABLE "public"."access_logs" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."access_logs_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."access_logs_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."access_logs_id_seq" OWNED BY "public"."access_logs"."id";



CREATE TABLE IF NOT EXISTS "public"."admin_notifications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "sender_id" "uuid" NOT NULL,
    "target_id" "uuid",
    "title" "text" NOT NULL,
    "body" "text",
    "type" "text" DEFAULT 'info'::"text",
    "is_global" boolean DEFAULT false,
    "read_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "admin_notifications_type_check" CHECK (("type" = ANY (ARRAY['info'::"text", 'warning'::"text", 'promo'::"text", 'system'::"text"])))
);


ALTER TABLE "public"."admin_notifications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."audit_log" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "admin_id" "uuid" NOT NULL,
    "action" "text" NOT NULL,
    "target_type" "text",
    "target_id" "text",
    "details" "jsonb" DEFAULT '{}'::"jsonb",
    "ip_address" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."audit_log" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."breach_log" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "detected_by" "uuid",
    "severity" "text" NOT NULL,
    "description" "text" NOT NULL,
    "affected_users" integer DEFAULT 0,
    "data_types_affected" "text"[],
    "containment_actions" "text",
    "notification_sent" boolean DEFAULT false,
    "notification_sent_at" timestamp with time zone,
    "dpa_notified" boolean DEFAULT false,
    "dpa_notified_at" timestamp with time zone,
    "status" "text" DEFAULT 'detected'::"text",
    "resolved_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "breach_log_severity_check" CHECK (("severity" = ANY (ARRAY['low'::"text", 'medium'::"text", 'high'::"text", 'critical'::"text"]))),
    CONSTRAINT "breach_log_status_check" CHECK (("status" = ANY (ARRAY['detected'::"text", 'investigating'::"text", 'contained'::"text", 'resolved'::"text"])))
);


ALTER TABLE "public"."breach_log" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."broadcasts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "sender_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "body" "text" NOT NULL,
    "recipient_count" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "broadcasts_body_check" CHECK ((("char_length"("body") >= 1) AND ("char_length"("body") <= 5000))),
    CONSTRAINT "broadcasts_title_check" CHECK ((("char_length"("title") >= 1) AND ("char_length"("title") <= 200)))
);


ALTER TABLE "public"."broadcasts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."certificates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "course_id" "uuid" NOT NULL,
    "certificate_number" "text" NOT NULL,
    "pdf_path" "text",
    "issued_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "email_sent_at" timestamp with time zone
);


ALTER TABLE "public"."certificates" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."community_posts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "creator_id" "uuid" NOT NULL,
    "title" "text",
    "body" "text",
    "media_url" "text",
    "media_path" "text",
    "is_subscribers_only" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."community_posts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."consent_log" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "session_id" "text",
    "ip_address" "text",
    "consent_type" "text" DEFAULT 'cookie'::"text" NOT NULL,
    "categories" "jsonb" DEFAULT '{"necessary": true}'::"jsonb" NOT NULL,
    "action" "text" NOT NULL,
    "policy_version" "text" DEFAULT '1.0'::"text",
    "user_agent" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "consent_log_action_check" CHECK (("action" = ANY (ARRAY['accept'::"text", 'reject'::"text", 'update'::"text", 'revoke'::"text"])))
);


ALTER TABLE "public"."consent_log" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."content_behaviors" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "creator_id" "text" NOT NULL,
    "views" integer DEFAULT 0 NOT NULL,
    "likes" integer DEFAULT 0 NOT NULL,
    "dwell_ms" integer DEFAULT 0 NOT NULL,
    "last_seen" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."content_behaviors" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."coupons" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "code" "text" NOT NULL,
    "discount_percent" integer DEFAULT 0 NOT NULL,
    "discount_tokens" integer DEFAULT 0 NOT NULL,
    "max_uses" integer,
    "used_count" integer DEFAULT 0 NOT NULL,
    "valid_from" timestamp with time zone DEFAULT "now"(),
    "valid_until" timestamp with time zone,
    "creator_id" "uuid",
    "active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."coupons" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."course_access" (
    "user_id" "uuid" NOT NULL,
    "course_id" "uuid" NOT NULL,
    "granted_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "granted_by" "uuid",
    "source" "text" DEFAULT 'manual'::"text" NOT NULL,
    "external_reference" "text",
    CONSTRAINT "course_access_source_check" CHECK (("source" = ANY (ARRAY['manual'::"text", 'webhook'::"text", 'external_payment'::"text"])))
);


ALTER TABLE "public"."course_access" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."course_drafts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "course_id" "uuid" NOT NULL,
    "creator_id" "uuid" NOT NULL,
    "data" "jsonb" NOT NULL,
    "version" integer DEFAULT 1 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."course_drafts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."course_lessons" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "course_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "body" "text",
    "media_url" "text",
    "media_path" "text",
    "position" integer DEFAULT 0 NOT NULL,
    "is_preview" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "attachments" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL
);


ALTER TABLE "public"."course_lessons" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."courses" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "creator_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "cover_url" "text",
    "price" numeric DEFAULT 0 NOT NULL,
    "external_payment_link" "text",
    "is_published" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "landing_data" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL
);


ALTER TABLE "public"."courses" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."creator_kpi_aggregated" (
    "creator_id" "uuid" NOT NULL,
    "total_courses" integer DEFAULT 0 NOT NULL,
    "total_students" integer DEFAULT 0 NOT NULL,
    "total_live_attendees" integer DEFAULT 0 NOT NULL,
    "total_revenue_estimated" numeric(12,2) DEFAULT 0 NOT NULL,
    "conversion_rate_estimated" numeric(5,4) DEFAULT 0 NOT NULL,
    "visibility_score" integer DEFAULT 0 NOT NULL,
    "last_updated" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."creator_kpi_aggregated" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."creator_kpi_daily" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "creator_id" "uuid" NOT NULL,
    "date" "date" NOT NULL,
    "profile_views" integer DEFAULT 0 NOT NULL,
    "course_views" integer DEFAULT 0 NOT NULL,
    "live_views" integer DEFAULT 0 NOT NULL,
    "community_views" integer DEFAULT 0 NOT NULL,
    "new_followers" integer DEFAULT 0 NOT NULL,
    "new_students" integer DEFAULT 0 NOT NULL,
    "estimated_revenue" numeric(12,2) DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."creator_kpi_daily" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."creator_plan_subscriptions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "creator_id" "uuid" NOT NULL,
    "plan_id" "text" NOT NULL,
    "started_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "expires_at" timestamp with time zone,
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "external_reference" "text",
    "granted_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "creator_plan_subscriptions_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'cancelled'::"text", 'expired'::"text"])))
);


ALTER TABLE "public"."creator_plan_subscriptions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."creator_plans" (
    "id" "text" NOT NULL,
    "name" "text" NOT NULL,
    "price_monthly" numeric(10,2) DEFAULT 0 NOT NULL,
    "external_payment_link" "text",
    "max_courses" integer,
    "max_live_per_month" integer,
    "analytics_level" "text" DEFAULT 'none'::"text" NOT NULL,
    "priority_visibility" integer DEFAULT 0 NOT NULL,
    "support_level" "text" DEFAULT 'community'::"text" NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "position" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "features" "text" DEFAULT 'basic'::"text" NOT NULL,
    "analytics_tier" integer DEFAULT 0 NOT NULL,
    "contact_only" boolean DEFAULT false NOT NULL,
    "stripe_price_id" "text",
    CONSTRAINT "creator_plans_analytics_level_check" CHECK (("analytics_level" = ANY (ARRAY['none'::"text", 'basic'::"text", 'advanced'::"text", 'full'::"text"]))),
    CONSTRAINT "creator_plans_support_level_check" CHECK (("support_level" = ANY (ARRAY['community'::"text", 'email'::"text", 'priority'::"text"])))
);


ALTER TABLE "public"."creator_plans" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."creator_profiles" (
    "user_id" "uuid" NOT NULL,
    "bio" "text",
    "external_payment_link" "text",
    "stripe_account_id" "text",
    "monthly_subscription_price" numeric DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "profile_image_url" "text",
    "cover_image_url" "text",
    "channel_name" "text"
);


ALTER TABLE "public"."creator_profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."creator_promo_grants" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "creator_id" "uuid" NOT NULL,
    "email_normalized" "text" NOT NULL,
    "payment_link_hash" "text" NOT NULL,
    "months_granted" integer NOT NULL,
    "tier" integer NOT NULL,
    "granted_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "creator_promo_grants_tier_chk" CHECK (("tier" = ANY (ARRAY[1, 2, 3])))
);


ALTER TABLE "public"."creator_promo_grants" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."creator_promo_counter" AS
 SELECT ("count"(*) FILTER (WHERE ("tier" = 3)))::integer AS "tier3_used",
    ("count"(*) FILTER (WHERE ("tier" = 2)))::integer AS "tier2_used",
    ("count"(*))::integer AS "total_grants"
   FROM "public"."creator_promo_grants";


ALTER VIEW "public"."creator_promo_counter" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."creator_scores" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "creator_id" "text" NOT NULL,
    "display_name" "text",
    "global_conversion_rate" numeric(6,4) DEFAULT 0 NOT NULL,
    "payload" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."creator_scores" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."creator_segments" (
    "creator_id" "uuid" NOT NULL,
    "segment_type" "text" DEFAULT 'starter'::"text" NOT NULL,
    "score" integer DEFAULT 0 NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "creator_segments_segment_type_check" CHECK (("segment_type" = ANY (ARRAY['starter'::"text", 'growing'::"text", 'pro'::"text", 'elite'::"text"])))
);


ALTER TABLE "public"."creator_segments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."cron_status" (
    "job_name" "text" NOT NULL,
    "last_run" timestamp with time zone,
    "status" "text" DEFAULT 'unknown'::"text" NOT NULL,
    "error" "text",
    "duration_ms" integer,
    "details" "jsonb",
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."cron_status" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."data_export_requests" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "download_url" "text",
    "expires_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "data_export_requests_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'processing'::"text", 'ready'::"text", 'expired'::"text"])))
);


ALTER TABLE "public"."data_export_requests" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."deletion_requests" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "reason" "text",
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "scheduled_at" timestamp with time zone DEFAULT ("now"() + '30 days'::interval) NOT NULL,
    "completed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "deletion_requests_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'processing'::"text", 'completed'::"text", 'cancelled'::"text"])))
);


ALTER TABLE "public"."deletion_requests" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."direct_messages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "sender_id" "uuid" NOT NULL,
    "receiver_id" "uuid" NOT NULL,
    "message" "text" NOT NULL,
    "read" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."direct_messages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."email_preferences" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "marketing" boolean DEFAULT true NOT NULL,
    "product_updates" boolean DEFAULT true NOT NULL,
    "course_notifications" boolean DEFAULT true NOT NULL,
    "unsubscribed_all" boolean DEFAULT false NOT NULL,
    "unsubscribed_at" timestamp with time zone,
    "bounce_type" "text",
    "bounced_at" timestamp with time zone,
    "spam_reported_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."email_preferences" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."follows" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "fan_id" "uuid" NOT NULL,
    "creator_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "follows_no_self" CHECK (("fan_id" <> "creator_id"))
);


ALTER TABLE "public"."follows" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."lesson_completions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "lesson_id" "uuid" NOT NULL,
    "course_id" "uuid" NOT NULL,
    "completed_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."lesson_completions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."live_access" (
    "user_id" "uuid" NOT NULL,
    "live_event_id" "uuid" NOT NULL,
    "granted_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "granted_by" "uuid",
    "source" "text" DEFAULT 'manual'::"text" NOT NULL,
    "external_reference" "text",
    CONSTRAINT "live_access_source_check" CHECK (("source" = ANY (ARRAY['manual'::"text", 'webhook'::"text", 'external_payment'::"text"])))
);


ALTER TABLE "public"."live_access" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."live_chat_messages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "live_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "message" "text" NOT NULL,
    "type" "text" DEFAULT 'chat'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "live_chat_messages_message_check" CHECK ((("char_length"("message") >= 1) AND ("char_length"("message") <= 1000))),
    CONSTRAINT "live_chat_messages_type_check" CHECK (("type" = ANY (ARRAY['chat'::"text", 'system'::"text"])))
);


ALTER TABLE "public"."live_chat_messages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."live_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "creator_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "cover_url" "text",
    "scheduled_at" timestamp with time zone,
    "duration_minutes" integer,
    "price" numeric DEFAULT 0 NOT NULL,
    "external_payment_link" "text",
    "is_published" boolean DEFAULT false NOT NULL,
    "recording_url" "text",
    "status" "text" DEFAULT 'scheduled'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "stream_url" "text",
    "viewer_count" integer DEFAULT 0 NOT NULL,
    "started_at" timestamp with time zone,
    "ended_at" timestamp with time zone,
    CONSTRAINT "live_events_status_check" CHECK (("status" = ANY (ARRAY['scheduled'::"text", 'live'::"text", 'ended'::"text", 'cancelled'::"text"])))
);


ALTER TABLE "public"."live_events" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."login_log" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "email" "text",
    "success" boolean NOT NULL,
    "ip_address" "text",
    "user_agent" "text",
    "failure_reason" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."login_log" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."notification_preferences" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "creator_id" "uuid",
    "type" "text" NOT NULL,
    "muted" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."notification_preferences" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."notifications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "type" "text" NOT NULL,
    "title" "text" NOT NULL,
    "body" "text",
    "ref_id" "text",
    "read" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."notifications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."platform_subscriptions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "status" "text" NOT NULL,
    "trial_start" timestamp with time zone,
    "trial_end" timestamp with time zone,
    "current_period_start" timestamp with time zone,
    "current_period_end" timestamp with time zone,
    "cancel_at_period_end" boolean DEFAULT false NOT NULL,
    "external_provider" "text",
    "external_customer_id" "text",
    "external_subscription_id" "text",
    "amount_cents" integer DEFAULT 99 NOT NULL,
    "currency" "text" DEFAULT 'EUR'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "trial_reminder_sent_at" timestamp with time zone,
    CONSTRAINT "platform_subscriptions_status_check" CHECK (("status" = ANY (ARRAY['trial'::"text", 'active'::"text", 'past_due'::"text", 'canceled'::"text", 'expired'::"text"])))
);


ALTER TABLE "public"."platform_subscriptions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "email" "text" NOT NULL,
    "full_name" "text",
    "handle" "text",
    "bio" "text",
    "avatar_url" "text",
    "cover_url" "text",
    "role" "text" DEFAULT 'fan'::"text" NOT NULL,
    "onboarding_complete" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "category" "text",
    "tags" "text",
    "notification_prefs" "jsonb" DEFAULT '{}'::"jsonb",
    "kyc_status" "text" DEFAULT 'none'::"text" NOT NULL,
    "kyc_document_url" "text",
    "date_of_birth" "date",
    "age_verified" boolean DEFAULT false,
    "marketing_consent" boolean DEFAULT false,
    "marketing_consent_at" timestamp with time zone,
    "deletion_requested_at" timestamp with time zone,
    "age_verified_at" timestamp with time zone,
    CONSTRAINT "profiles_kyc_status_check" CHECK (("kyc_status" = ANY (ARRAY['none'::"text", 'pending'::"text", 'approved'::"text", 'rejected'::"text"]))),
    CONSTRAINT "profiles_role_check" CHECK (("role" = ANY (ARRAY['fan'::"text", 'creator'::"text", 'admin'::"text"]))),
    CONSTRAINT "profiles_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'warned'::"text", 'suspended'::"text", 'banned'::"text"])))
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."subscriptions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "fan_id" "uuid" NOT NULL,
    "creator_id" "uuid" NOT NULL,
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "started_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "expires_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "stripe_subscription_id" "text",
    CONSTRAINT "subscriptions_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'cancelled'::"text", 'expired'::"text"])))
);


ALTER TABLE "public"."subscriptions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."system_config" (
    "key" "text" NOT NULL,
    "value" "jsonb" NOT NULL,
    "updated_by" "uuid",
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."system_config" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_profiles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "user_email" "text",
    "segment" "text",
    "preferences" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."user_profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_reports" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "reporter_id" "uuid" NOT NULL,
    "target_id" "uuid" NOT NULL,
    "target_role" "text" NOT NULL,
    "reason" "text" NOT NULL,
    "description" "text",
    "context_type" "text",
    "context_id" "text",
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "resolved_by" "uuid",
    "resolved_at" timestamp with time zone,
    "action_taken" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "user_reports_reason_check" CHECK (("reason" = ANY (ARRAY['spam'::"text", 'harassment'::"text", 'scam'::"text", 'inappropriate'::"text", 'impersonation'::"text", 'other'::"text"]))),
    CONSTRAINT "user_reports_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'resolved'::"text", 'dismissed'::"text"]))),
    CONSTRAINT "user_reports_target_role_check" CHECK (("target_role" = ANY (ARRAY['fan'::"text", 'creator'::"text", 'admin'::"text"])))
);


ALTER TABLE "public"."user_reports" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."webhook_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "provider" "text" NOT NULL,
    "event_type" "text" NOT NULL,
    "event_id" "text" NOT NULL,
    "payload" "jsonb",
    "status" "text" DEFAULT 'processed'::"text" NOT NULL,
    "processed_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."webhook_events" OWNER TO "postgres";


ALTER TABLE ONLY "public"."access_logs" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."access_logs_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."access_logs"
    ADD CONSTRAINT "access_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."admin_notifications"
    ADD CONSTRAINT "admin_notifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."audit_log"
    ADD CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."breach_log"
    ADD CONSTRAINT "breach_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."broadcasts"
    ADD CONSTRAINT "broadcasts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."certificates"
    ADD CONSTRAINT "certificates_certificate_number_key" UNIQUE ("certificate_number");



ALTER TABLE ONLY "public"."certificates"
    ADD CONSTRAINT "certificates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."community_posts"
    ADD CONSTRAINT "community_posts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."consent_log"
    ADD CONSTRAINT "consent_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."content_behaviors"
    ADD CONSTRAINT "content_behaviors_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."content_behaviors"
    ADD CONSTRAINT "content_behaviors_user_id_creator_id_key" UNIQUE ("user_id", "creator_id");



ALTER TABLE ONLY "public"."coupons"
    ADD CONSTRAINT "coupons_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."coupons"
    ADD CONSTRAINT "coupons_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."course_access"
    ADD CONSTRAINT "course_access_pkey" PRIMARY KEY ("user_id", "course_id");



ALTER TABLE ONLY "public"."course_drafts"
    ADD CONSTRAINT "course_drafts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."course_lessons"
    ADD CONSTRAINT "course_lessons_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."courses"
    ADD CONSTRAINT "courses_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."creator_kpi_aggregated"
    ADD CONSTRAINT "creator_kpi_aggregated_pkey" PRIMARY KEY ("creator_id");



ALTER TABLE ONLY "public"."creator_kpi_daily"
    ADD CONSTRAINT "creator_kpi_daily_creator_id_date_key" UNIQUE ("creator_id", "date");



ALTER TABLE ONLY "public"."creator_kpi_daily"
    ADD CONSTRAINT "creator_kpi_daily_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."creator_plan_subscriptions"
    ADD CONSTRAINT "creator_plan_subscriptions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."creator_plans"
    ADD CONSTRAINT "creator_plans_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."creator_profiles"
    ADD CONSTRAINT "creator_profiles_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."creator_promo_grants"
    ADD CONSTRAINT "creator_promo_grants_email_unique" UNIQUE ("email_normalized");



ALTER TABLE ONLY "public"."creator_promo_grants"
    ADD CONSTRAINT "creator_promo_grants_link_unique" UNIQUE ("payment_link_hash");



ALTER TABLE ONLY "public"."creator_promo_grants"
    ADD CONSTRAINT "creator_promo_grants_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."creator_scores"
    ADD CONSTRAINT "creator_scores_creator_id_key" UNIQUE ("creator_id");



ALTER TABLE ONLY "public"."creator_scores"
    ADD CONSTRAINT "creator_scores_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."creator_segments"
    ADD CONSTRAINT "creator_segments_pkey" PRIMARY KEY ("creator_id");



ALTER TABLE ONLY "public"."cron_status"
    ADD CONSTRAINT "cron_status_pkey" PRIMARY KEY ("job_name");



ALTER TABLE ONLY "public"."data_export_requests"
    ADD CONSTRAINT "data_export_requests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."deletion_requests"
    ADD CONSTRAINT "deletion_requests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."direct_messages"
    ADD CONSTRAINT "direct_messages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."email_preferences"
    ADD CONSTRAINT "email_preferences_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."email_preferences"
    ADD CONSTRAINT "email_preferences_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."_archived_financial_logs"
    ADD CONSTRAINT "financial_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."follows"
    ADD CONSTRAINT "follows_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."follows"
    ADD CONSTRAINT "follows_unique" UNIQUE ("fan_id", "creator_id");



ALTER TABLE ONLY "public"."_archived_fraud_logs"
    ADD CONSTRAINT "fraud_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."lesson_completions"
    ADD CONSTRAINT "lesson_completions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."lesson_completions"
    ADD CONSTRAINT "lesson_completions_unique" UNIQUE ("user_id", "lesson_id");



ALTER TABLE ONLY "public"."live_access"
    ADD CONSTRAINT "live_access_pkey" PRIMARY KEY ("user_id", "live_event_id");



ALTER TABLE ONLY "public"."live_chat_messages"
    ADD CONSTRAINT "live_chat_messages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."live_events"
    ADD CONSTRAINT "live_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."login_log"
    ADD CONSTRAINT "login_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notification_preferences"
    ADD CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notification_preferences"
    ADD CONSTRAINT "notification_preferences_user_id_creator_id_type_key" UNIQUE ("user_id", "creator_id", "type");



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."_archived_payment_orders"
    ADD CONSTRAINT "payment_orders_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."_archived_payout_requests"
    ADD CONSTRAINT "payout_requests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."platform_subscriptions"
    ADD CONSTRAINT "platform_subscriptions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."platform_subscriptions"
    ADD CONSTRAINT "platform_subscriptions_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_handle_key" UNIQUE ("handle");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."subscriptions"
    ADD CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."system_config"
    ADD CONSTRAINT "system_config_pkey" PRIMARY KEY ("key");



ALTER TABLE ONLY "public"."_archived_token_transactions"
    ADD CONSTRAINT "token_transactions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_profiles"
    ADD CONSTRAINT "user_profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_profiles"
    ADD CONSTRAINT "user_profiles_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."user_reports"
    ADD CONSTRAINT "user_reports_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."webhook_events"
    ADD CONSTRAINT "webhook_events_event_id_key" UNIQUE ("event_id");



ALTER TABLE ONLY "public"."_archived_webhook_events"
    ADD CONSTRAINT "webhook_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."webhook_events"
    ADD CONSTRAINT "webhook_events_pkey1" PRIMARY KEY ("id");



CREATE INDEX "access_logs_creator_idx" ON "public"."access_logs" USING "btree" ("creator_id", "created_at" DESC);



CREATE INDEX "access_logs_date_idx" ON "public"."access_logs" USING "btree" ("created_at");



CREATE INDEX "access_logs_user_idx" ON "public"."access_logs" USING "btree" ("user_id");



CREATE INDEX "broadcasts_sender_idx" ON "public"."broadcasts" USING "btree" ("sender_id", "created_at" DESC);



CREATE INDEX "community_posts_creator_idx" ON "public"."community_posts" USING "btree" ("creator_id", "created_at" DESC);



CREATE INDEX "content_behaviors_user_idx" ON "public"."content_behaviors" USING "btree" ("user_id");



CREATE INDEX "course_access_course_idx" ON "public"."course_access" USING "btree" ("course_id");



CREATE INDEX "course_access_user_idx" ON "public"."course_access" USING "btree" ("user_id");



CREATE INDEX "course_drafts_creator_idx" ON "public"."course_drafts" USING "btree" ("creator_id", "created_at" DESC);



CREATE INDEX "course_drafts_latest_idx" ON "public"."course_drafts" USING "btree" ("course_id", "created_at" DESC);



CREATE INDEX "course_lessons_course_idx" ON "public"."course_lessons" USING "btree" ("course_id", "position");



CREATE INDEX "courses_creator_idx" ON "public"."courses" USING "btree" ("creator_id");



CREATE INDEX "courses_published_idx" ON "public"."courses" USING "btree" ("is_published") WHERE ("is_published" = true);



CREATE INDEX "creator_kpi_agg_visibility_idx" ON "public"."creator_kpi_aggregated" USING "btree" ("visibility_score" DESC);



CREATE INDEX "creator_kpi_daily_creator_idx" ON "public"."creator_kpi_daily" USING "btree" ("creator_id", "date" DESC);



CREATE UNIQUE INDEX "creator_plan_subs_active_unique" ON "public"."creator_plan_subscriptions" USING "btree" ("creator_id") WHERE ("status" = 'active'::"text");



CREATE INDEX "creator_scores_conv_idx" ON "public"."creator_scores" USING "btree" ("global_conversion_rate" DESC);



CREATE INDEX "financial_logs_action_idx" ON "public"."_archived_financial_logs" USING "btree" ("action", "created_at" DESC);



CREATE INDEX "financial_logs_actor_idx" ON "public"."_archived_financial_logs" USING "btree" ("actor_id", "created_at" DESC);



CREATE INDEX "follows_creator_fan_idx" ON "public"."follows" USING "btree" ("creator_id", "fan_id");



CREATE INDEX "follows_creator_idx" ON "public"."follows" USING "btree" ("creator_id");



CREATE INDEX "follows_fan_idx" ON "public"."follows" USING "btree" ("fan_id");



CREATE INDEX "fraud_logs_severity_idx" ON "public"."_archived_fraud_logs" USING "btree" ("severity", "resolved", "created_at" DESC);



CREATE INDEX "fraud_logs_user_idx" ON "public"."_archived_fraud_logs" USING "btree" ("user_id", "created_at" DESC);



CREATE INDEX "idx_admin_notif_created" ON "public"."admin_notifications" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_admin_notif_global" ON "public"."admin_notifications" USING "btree" ("is_global") WHERE ("is_global" = true);



CREATE INDEX "idx_admin_notif_target" ON "public"."admin_notifications" USING "btree" ("target_id");



CREATE INDEX "idx_audit_log_action" ON "public"."audit_log" USING "btree" ("action");



CREATE INDEX "idx_audit_log_admin" ON "public"."audit_log" USING "btree" ("admin_id");



CREATE INDEX "idx_audit_log_created" ON "public"."audit_log" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_audit_log_target" ON "public"."audit_log" USING "btree" ("target_type", "target_id");



CREATE INDEX "idx_consent_log_created" ON "public"."consent_log" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_consent_log_user" ON "public"."consent_log" USING "btree" ("user_id");



CREATE INDEX "idx_course_access_user_course" ON "public"."course_access" USING "btree" ("user_id", "course_id");



CREATE INDEX "idx_courses_creator" ON "public"."courses" USING "btree" ("creator_id");



CREATE INDEX "idx_creator_promo_grants_creator" ON "public"."creator_promo_grants" USING "btree" ("creator_id");



CREATE INDEX "idx_creator_promo_grants_granted_at" ON "public"."creator_promo_grants" USING "btree" ("granted_at" DESC);



CREATE INDEX "idx_deletion_user" ON "public"."deletion_requests" USING "btree" ("user_id");



CREATE INDEX "idx_dm_conversation" ON "public"."direct_messages" USING "btree" (LEAST("sender_id", "receiver_id"), GREATEST("sender_id", "receiver_id"), "created_at" DESC);



CREATE INDEX "idx_dm_receiver" ON "public"."direct_messages" USING "btree" ("receiver_id", "created_at" DESC);



CREATE INDEX "idx_dm_sender" ON "public"."direct_messages" USING "btree" ("sender_id", "created_at" DESC);



CREATE INDEX "idx_email_preferences_user" ON "public"."email_preferences" USING "btree" ("user_id");



CREATE INDEX "idx_lesson_completions_course_user" ON "public"."lesson_completions" USING "btree" ("course_id", "user_id");



CREATE INDEX "idx_lesson_completions_user_at" ON "public"."lesson_completions" USING "btree" ("user_id", "completed_at" DESC);



CREATE INDEX "idx_lesson_completions_user_course" ON "public"."lesson_completions" USING "btree" ("user_id", "course_id");



CREATE INDEX "idx_login_log_created" ON "public"."login_log" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_login_log_user" ON "public"."login_log" USING "btree" ("user_id");



CREATE INDEX "idx_notifications_user" ON "public"."notifications" USING "btree" ("user_id", "read", "created_at" DESC);



CREATE INDEX "idx_notifications_user_unread" ON "public"."notifications" USING "btree" ("user_id", "read", "created_at" DESC) WHERE ("read" = false);



CREATE INDEX "idx_ps_trial_reminder" ON "public"."platform_subscriptions" USING "btree" ("status", "trial_end") WHERE (("status" = 'trial'::"text") AND ("trial_reminder_sent_at" IS NULL));



CREATE INDEX "live_chat_live_idx" ON "public"."live_chat_messages" USING "btree" ("live_id", "created_at");



CREATE INDEX "live_events_creator_idx" ON "public"."live_events" USING "btree" ("creator_id", "scheduled_at" DESC);



CREATE INDEX "live_events_published_idx" ON "public"."live_events" USING "btree" ("is_published", "scheduled_at" DESC) WHERE ("is_published" = true);



CREATE INDEX "notif_pref_creator_idx" ON "public"."notification_preferences" USING "btree" ("creator_id");



CREATE INDEX "notif_pref_user_idx" ON "public"."notification_preferences" USING "btree" ("user_id");



CREATE INDEX "notifications_user_created_idx" ON "public"."notifications" USING "btree" ("user_id", "created_at" DESC);



CREATE INDEX "notifications_user_unread_idx" ON "public"."notifications" USING "btree" ("user_id", "read") WHERE ("read" = false);



CREATE INDEX "payment_orders_status_idx" ON "public"."_archived_payment_orders" USING "btree" ("status", "created_at" DESC);



CREATE INDEX "payment_orders_user_idx" ON "public"."_archived_payment_orders" USING "btree" ("user_id", "created_at" DESC);



CREATE INDEX "payout_requests_creator_idx" ON "public"."_archived_payout_requests" USING "btree" ("creator_id", "created_at" DESC);



CREATE INDEX "platform_subs_status_idx" ON "public"."platform_subscriptions" USING "btree" ("status", "current_period_end");



CREATE INDEX "platform_subs_trial_end_idx" ON "public"."platform_subscriptions" USING "btree" ("trial_end") WHERE ("status" = 'trial'::"text");



CREATE INDEX "profiles_role_idx" ON "public"."profiles" USING "btree" ("role");



CREATE INDEX "subscriptions_creator_idx" ON "public"."subscriptions" USING "btree" ("creator_id", "status");



CREATE UNIQUE INDEX "subscriptions_fan_creator_idx" ON "public"."subscriptions" USING "btree" ("fan_id", "creator_id") WHERE ("status" = 'active'::"text");



CREATE UNIQUE INDEX "subscriptions_fan_creator_unique" ON "public"."subscriptions" USING "btree" ("fan_id", "creator_id");



CREATE INDEX "token_transactions_user_idx" ON "public"."_archived_token_transactions" USING "btree" ("user_id", "wallet_type", "created_at" DESC);



CREATE INDEX "tx_available_at_idx" ON "public"."_archived_token_transactions" USING "btree" ("user_id", "wallet_type", "available_at") WHERE (("wallet_type" = 'creator'::"text") AND ("type" = 'earn'::"text"));



CREATE INDEX "user_reports_reporter_idx" ON "public"."user_reports" USING "btree" ("reporter_id");



CREATE INDEX "user_reports_status_idx" ON "public"."user_reports" USING "btree" ("status", "created_at" DESC);



CREATE INDEX "user_reports_target_idx" ON "public"."user_reports" USING "btree" ("target_id");



CREATE INDEX "webhook_events_created_at_idx" ON "public"."webhook_events" USING "btree" ("created_at" DESC);



CREATE INDEX "webhook_events_event_id_idx" ON "public"."_archived_webhook_events" USING "btree" ("event_id");



CREATE INDEX "webhook_events_order_idx" ON "public"."_archived_webhook_events" USING "btree" ("order_id");



CREATE INDEX "webhook_events_provider_idx" ON "public"."_archived_webhook_events" USING "btree" ("provider", "created_at" DESC);



CREATE OR REPLACE TRIGGER "course_access_log_trg" AFTER INSERT ON "public"."course_access" FOR EACH ROW EXECUTE FUNCTION "public"."_log_access"();



CREATE OR REPLACE TRIGGER "live_access_log_trg" AFTER INSERT ON "public"."live_access" FOR EACH ROW EXECUTE FUNCTION "public"."_log_access"();



CREATE OR REPLACE TRIGGER "profiles_creator_welcome_plan" AFTER INSERT OR UPDATE OF "role" ON "public"."profiles" FOR EACH ROW WHEN (("new"."role" = 'creator'::"text")) EXECUTE FUNCTION "public"."grant_creator_welcome_plan"();



CREATE OR REPLACE TRIGGER "profiles_platform_trial" AFTER INSERT ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."grant_platform_trial"();



CREATE OR REPLACE TRIGGER "protect_role_on_profiles" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."protect_role_column"();



CREATE OR REPLACE TRIGGER "subscriptions_access_log_trg" AFTER INSERT ON "public"."subscriptions" FOR EACH ROW EXECUTE FUNCTION "public"."_log_access"();



CREATE OR REPLACE TRIGGER "touch_subscriptions" BEFORE UPDATE ON "public"."subscriptions" FOR EACH ROW EXECUTE FUNCTION "public"."touch_updated_at"();



CREATE OR REPLACE TRIGGER "trg_email_preferences_updated_at" BEFORE UPDATE ON "public"."email_preferences" FOR EACH ROW EXECUTE FUNCTION "public"."set_email_preferences_updated_at"();



CREATE OR REPLACE TRIGGER "trg_prevent_dob_update" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW WHEN ((("old"."date_of_birth" IS NOT NULL) AND ("old"."date_of_birth" IS DISTINCT FROM "new"."date_of_birth"))) EXECUTE FUNCTION "public"."prevent_dob_update"();



ALTER TABLE ONLY "public"."access_logs"
    ADD CONSTRAINT "access_logs_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."access_logs"
    ADD CONSTRAINT "access_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."broadcasts"
    ADD CONSTRAINT "broadcasts_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."certificates"
    ADD CONSTRAINT "certificates_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."community_posts"
    ADD CONSTRAINT "community_posts_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."content_behaviors"
    ADD CONSTRAINT "content_behaviors_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."coupons"
    ADD CONSTRAINT "coupons_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."course_access"
    ADD CONSTRAINT "course_access_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."course_access"
    ADD CONSTRAINT "course_access_granted_by_fkey" FOREIGN KEY ("granted_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."course_access"
    ADD CONSTRAINT "course_access_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."course_drafts"
    ADD CONSTRAINT "course_drafts_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."course_drafts"
    ADD CONSTRAINT "course_drafts_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."course_lessons"
    ADD CONSTRAINT "course_lessons_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."courses"
    ADD CONSTRAINT "courses_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."creator_kpi_aggregated"
    ADD CONSTRAINT "creator_kpi_aggregated_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."creator_kpi_daily"
    ADD CONSTRAINT "creator_kpi_daily_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."creator_plan_subscriptions"
    ADD CONSTRAINT "creator_plan_subscriptions_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."creator_plan_subscriptions"
    ADD CONSTRAINT "creator_plan_subscriptions_granted_by_fkey" FOREIGN KEY ("granted_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."creator_plan_subscriptions"
    ADD CONSTRAINT "creator_plan_subscriptions_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "public"."creator_plans"("id");



ALTER TABLE ONLY "public"."creator_profiles"
    ADD CONSTRAINT "creator_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."creator_promo_grants"
    ADD CONSTRAINT "creator_promo_grants_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."creator_segments"
    ADD CONSTRAINT "creator_segments_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."direct_messages"
    ADD CONSTRAINT "direct_messages_receiver_id_fkey" FOREIGN KEY ("receiver_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."direct_messages"
    ADD CONSTRAINT "direct_messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."email_preferences"
    ADD CONSTRAINT "email_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."follows"
    ADD CONSTRAINT "follows_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."follows"
    ADD CONSTRAINT "follows_fan_id_fkey" FOREIGN KEY ("fan_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."lesson_completions"
    ADD CONSTRAINT "lesson_completions_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."lesson_completions"
    ADD CONSTRAINT "lesson_completions_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "public"."course_lessons"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."lesson_completions"
    ADD CONSTRAINT "lesson_completions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."live_access"
    ADD CONSTRAINT "live_access_granted_by_fkey" FOREIGN KEY ("granted_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."live_access"
    ADD CONSTRAINT "live_access_live_event_id_fkey" FOREIGN KEY ("live_event_id") REFERENCES "public"."live_events"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."live_access"
    ADD CONSTRAINT "live_access_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."live_chat_messages"
    ADD CONSTRAINT "live_chat_messages_live_id_fkey" FOREIGN KEY ("live_id") REFERENCES "public"."live_events"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."live_chat_messages"
    ADD CONSTRAINT "live_chat_messages_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."live_events"
    ADD CONSTRAINT "live_events_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notification_preferences"
    ADD CONSTRAINT "notification_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."_archived_payment_orders"
    ADD CONSTRAINT "payment_orders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."_archived_payout_requests"
    ADD CONSTRAINT "payout_requests_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."platform_subscriptions"
    ADD CONSTRAINT "platform_subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."subscriptions"
    ADD CONSTRAINT "subscriptions_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."subscriptions"
    ADD CONSTRAINT "subscriptions_fan_id_fkey" FOREIGN KEY ("fan_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."_archived_token_transactions"
    ADD CONSTRAINT "token_transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_profiles"
    ADD CONSTRAINT "user_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_reports"
    ADD CONSTRAINT "user_reports_reporter_id_fkey" FOREIGN KEY ("reporter_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_reports"
    ADD CONSTRAINT "user_reports_resolved_by_fkey" FOREIGN KEY ("resolved_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."user_reports"
    ADD CONSTRAINT "user_reports_target_id_fkey" FOREIGN KEY ("target_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



CREATE POLICY "Creators can remove followers" ON "public"."follows" FOR DELETE USING (("auth"."uid"() = "creator_id"));



CREATE POLICY "Creators can see their followers" ON "public"."follows" FOR SELECT USING (("auth"."uid"() = "creator_id"));



CREATE POLICY "Service role full access email_preferences" ON "public"."email_preferences" USING (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "Users can follow creators" ON "public"."follows" FOR INSERT WITH CHECK (("auth"."uid"() = "fan_id"));



CREATE POLICY "Users can see their own follows" ON "public"."follows" FOR SELECT USING (("auth"."uid"() = "fan_id"));



CREATE POLICY "Users can unfollow" ON "public"."follows" FOR DELETE USING (("auth"."uid"() = "fan_id"));



CREATE POLICY "Users can update own email preferences" ON "public"."email_preferences" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own email preferences" ON "public"."email_preferences" FOR SELECT USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."_archived_financial_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."_archived_fraud_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."_archived_payment_orders" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."_archived_payout_requests" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."_archived_token_transactions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."_archived_webhook_events" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."access_logs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "access_logs_select_own_or_admin" ON "public"."access_logs" FOR SELECT USING ((("auth"."uid"() = "creator_id") OR (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text"))))));



CREATE POLICY "admin_cron_status" ON "public"."cron_status" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text")))));



CREATE POLICY "admin_notif_admin_all" ON "public"."admin_notifications" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text")))));



CREATE POLICY "admin_notif_own_read" ON "public"."admin_notifications" FOR SELECT USING ((("target_id" = "auth"."uid"()) OR ("is_global" = true)));



ALTER TABLE "public"."admin_notifications" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "admin_only" ON "public"."_archived_financial_logs" TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "admin_only" ON "public"."_archived_fraud_logs" TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "admin_only" ON "public"."_archived_payment_orders" TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "admin_only" ON "public"."_archived_payout_requests" TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "admin_only" ON "public"."_archived_token_transactions" TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "admin_only" ON "public"."_archived_webhook_events" TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



ALTER TABLE "public"."audit_log" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "audit_log_admin_only" ON "public"."audit_log" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text")))));



CREATE POLICY "audit_log_service_insert" ON "public"."audit_log" FOR INSERT WITH CHECK (true);



CREATE POLICY "behaviors_admin_read" ON "public"."content_behaviors" FOR SELECT USING ("public"."is_admin"());



CREATE POLICY "behaviors_owner_all" ON "public"."content_behaviors" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "breach_admin" ON "public"."breach_log" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text")))));



ALTER TABLE "public"."breach_log" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."broadcasts" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "broadcasts_select_own" ON "public"."broadcasts" FOR SELECT USING (("sender_id" = "auth"."uid"()));



ALTER TABLE "public"."certificates" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "certificates_select_own" ON "public"."certificates" FOR SELECT USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."community_posts" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "community_posts_owner_modify" ON "public"."community_posts" USING (("auth"."uid"() = "creator_id")) WITH CHECK (("auth"."uid"() = "creator_id"));



CREATE POLICY "community_posts_select_gated" ON "public"."community_posts" FOR SELECT USING ((("is_subscribers_only" = false) OR ("creator_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM "public"."subscriptions" "s"
  WHERE (("s"."fan_id" = "auth"."uid"()) AND ("s"."creator_id" = "community_posts"."creator_id") AND ("s"."status" = 'active'::"text") AND (("s"."expires_at" IS NULL) OR ("s"."expires_at" > "now"())))))));



ALTER TABLE "public"."consent_log" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "consent_log_own_insert" ON "public"."consent_log" FOR INSERT WITH CHECK (true);



CREATE POLICY "consent_log_own_read" ON "public"."consent_log" FOR SELECT USING ((("user_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text"))))));



ALTER TABLE "public"."content_behaviors" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."coupons" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "coupons_admin_all" ON "public"."coupons" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "coupons_read" ON "public"."coupons" FOR SELECT USING (("active" = true));



ALTER TABLE "public"."course_access" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "course_access_select_self_or_creator" ON "public"."course_access" FOR SELECT USING ((("auth"."uid"() = "user_id") OR (EXISTS ( SELECT 1
   FROM "public"."courses" "c"
  WHERE (("c"."id" = "course_access"."course_id") AND ("c"."creator_id" = "auth"."uid"()))))));



ALTER TABLE "public"."course_drafts" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "course_drafts_select_own" ON "public"."course_drafts" FOR SELECT USING ((("auth"."uid"() = "creator_id") OR (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text"))))));



ALTER TABLE "public"."course_lessons" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "course_lessons_owner_modify" ON "public"."course_lessons" USING ((EXISTS ( SELECT 1
   FROM "public"."courses" "c"
  WHERE (("c"."id" = "course_lessons"."course_id") AND ("c"."creator_id" = "auth"."uid"()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."courses" "c"
  WHERE (("c"."id" = "course_lessons"."course_id") AND ("c"."creator_id" = "auth"."uid"())))));



CREATE POLICY "course_lessons_select_gated" ON "public"."course_lessons" FOR SELECT USING ((("is_preview" = true) OR (EXISTS ( SELECT 1
   FROM "public"."courses" "c"
  WHERE (("c"."id" = "course_lessons"."course_id") AND ("c"."creator_id" = "auth"."uid"())))) OR (EXISTS ( SELECT 1
   FROM "public"."course_access" "ca"
  WHERE (("ca"."course_id" = "ca"."course_id") AND ("ca"."user_id" = "auth"."uid"()))))));



ALTER TABLE "public"."courses" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "courses_owner_modify" ON "public"."courses" USING (("auth"."uid"() = "creator_id")) WITH CHECK (("auth"."uid"() = "creator_id"));



CREATE POLICY "courses_select_published" ON "public"."courses" FOR SELECT USING ((("is_published" = true) OR ("creator_id" = "auth"."uid"())));



CREATE POLICY "cpg_self_select" ON "public"."creator_promo_grants" FOR SELECT USING (("auth"."uid"() = "creator_id"));



ALTER TABLE "public"."creator_kpi_aggregated" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."creator_kpi_daily" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "creator_plan_subs_select_own_or_admin" ON "public"."creator_plan_subscriptions" FOR SELECT USING ((("auth"."uid"() = "creator_id") OR (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text"))))));



ALTER TABLE "public"."creator_plan_subscriptions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."creator_plans" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."creator_profiles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "creator_profiles_owner_modify" ON "public"."creator_profiles" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "creator_profiles_select_all" ON "public"."creator_profiles" FOR SELECT USING (true);



ALTER TABLE "public"."creator_promo_grants" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."creator_scores" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "creator_scores_read" ON "public"."creator_scores" FOR SELECT USING (true);



ALTER TABLE "public"."creator_segments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."cron_status" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."data_export_requests" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "deletion_own" ON "public"."deletion_requests" USING ((("user_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text"))))));



ALTER TABLE "public"."deletion_requests" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."direct_messages" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "dm_insert_sender" ON "public"."direct_messages" FOR INSERT WITH CHECK (("auth"."uid"() = "sender_id"));



CREATE POLICY "dm_select_own" ON "public"."direct_messages" FOR SELECT USING ((("auth"."uid"() = "sender_id") OR ("auth"."uid"() = "receiver_id")));



CREATE POLICY "dm_update_read" ON "public"."direct_messages" FOR UPDATE USING (("auth"."uid"() = "receiver_id")) WITH CHECK (("auth"."uid"() = "receiver_id"));



ALTER TABLE "public"."email_preferences" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "export_own" ON "public"."data_export_requests" USING ((("user_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text"))))));



CREATE POLICY "financial_logs_admin_only" ON "public"."_archived_financial_logs" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text")))));



ALTER TABLE "public"."follows" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "fraud_logs_admin_only" ON "public"."_archived_fraud_logs" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text")))));



CREATE POLICY "kpi_agg_select_all" ON "public"."creator_kpi_aggregated" FOR SELECT USING (true);



CREATE POLICY "kpi_daily_own_or_admin" ON "public"."creator_kpi_daily" FOR SELECT USING ((("auth"."uid"() = "creator_id") OR (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text"))))));



CREATE POLICY "lc_delete_own" ON "public"."lesson_completions" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "lc_insert_own" ON "public"."lesson_completions" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "lc_select_own" ON "public"."lesson_completions" FOR SELECT USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."lesson_completions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."live_access" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "live_access_select_self_or_creator" ON "public"."live_access" FOR SELECT USING ((("auth"."uid"() = "user_id") OR (EXISTS ( SELECT 1
   FROM "public"."live_events" "e"
  WHERE (("e"."id" = "live_access"."live_event_id") AND ("e"."creator_id" = "auth"."uid"()))))));



CREATE POLICY "live_chat_insert_own_with_access" ON "public"."live_chat_messages" FOR INSERT WITH CHECK ((("user_id" = "auth"."uid"()) AND ("type" = 'chat'::"text") AND (EXISTS ( SELECT 1
   FROM "public"."live_events" "e"
  WHERE (("e"."id" = "live_chat_messages"."live_id") AND ("e"."status" = 'live'::"text") AND (("e"."creator_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
           FROM "public"."live_access" "la"
          WHERE (("la"."live_event_id" = "e"."id") AND ("la"."user_id" = "auth"."uid"())))) OR (("e"."is_published" = true) AND (COALESCE("e"."price", (0)::numeric) = (0)::numeric))))))));



ALTER TABLE "public"."live_chat_messages" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "live_chat_select_with_access" ON "public"."live_chat_messages" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."live_events" "e"
  WHERE (("e"."id" = "live_chat_messages"."live_id") AND (("e"."creator_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
           FROM "public"."live_access" "la"
          WHERE (("la"."live_event_id" = "e"."id") AND ("la"."user_id" = "auth"."uid"())))) OR (("e"."is_published" = true) AND (COALESCE("e"."price", (0)::numeric) = (0)::numeric)))))));



ALTER TABLE "public"."live_events" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "live_events_owner_modify" ON "public"."live_events" USING (("auth"."uid"() = "creator_id")) WITH CHECK (("auth"."uid"() = "creator_id"));



CREATE POLICY "live_events_select_published" ON "public"."live_events" FOR SELECT USING ((("is_published" = true) OR ("creator_id" = "auth"."uid"())));



ALTER TABLE "public"."login_log" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "login_log_admin" ON "public"."login_log" FOR SELECT USING ((("user_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text"))))));



CREATE POLICY "login_log_insert" ON "public"."login_log" FOR INSERT WITH CHECK (true);



ALTER TABLE "public"."notification_preferences" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."notifications" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "notifications_insert_own" ON "public"."notifications" FOR INSERT WITH CHECK (("auth"."uid"() IS NOT NULL));



CREATE POLICY "notifications_select_own" ON "public"."notifications" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "notifications_update_own" ON "public"."notifications" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "np_delete_own" ON "public"."notification_preferences" FOR DELETE USING (("user_id" = "auth"."uid"()));



CREATE POLICY "np_insert_own" ON "public"."notification_preferences" FOR INSERT WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "np_select_own" ON "public"."notification_preferences" FOR SELECT USING (("user_id" = "auth"."uid"()));



CREATE POLICY "np_update_own" ON "public"."notification_preferences" FOR UPDATE USING (("user_id" = "auth"."uid"()));



CREATE POLICY "payment_orders_insert_own" ON "public"."_archived_payment_orders" FOR INSERT WITH CHECK ((("auth"."uid"() = "user_id") AND ("status" = 'pending'::"text")));



CREATE POLICY "payment_orders_select_own" ON "public"."_archived_payment_orders" FOR SELECT USING ((("auth"."uid"() = "user_id") OR (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text"))))));



CREATE POLICY "payment_orders_update_admin" ON "public"."_archived_payment_orders" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text")))));



CREATE POLICY "payouts_admin_read" ON "public"."_archived_payout_requests" FOR SELECT USING ("public"."is_admin"());



CREATE POLICY "payouts_owner_all" ON "public"."_archived_payout_requests" USING (("auth"."uid"() = "creator_id")) WITH CHECK (("auth"."uid"() = "creator_id"));



CREATE POLICY "payouts_select_own" ON "public"."_archived_payout_requests" FOR SELECT USING (("auth"."uid"() = "creator_id"));



CREATE POLICY "plans_select_all" ON "public"."creator_plans" FOR SELECT USING (("is_active" = true));



ALTER TABLE "public"."platform_subscriptions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "profiles_admin_update" ON "public"."profiles" FOR UPDATE USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "profiles_insert_own" ON "public"."profiles" FOR INSERT WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "profiles_select_all" ON "public"."profiles" FOR SELECT USING (true);



CREATE POLICY "profiles_update_own" ON "public"."profiles" FOR UPDATE USING (("auth"."uid"() = "id"));



CREATE POLICY "ps_select_own" ON "public"."platform_subscriptions" FOR SELECT USING (("user_id" = "auth"."uid"()));



CREATE POLICY "segments_select_all" ON "public"."creator_segments" FOR SELECT USING (true);



CREATE POLICY "subs_insert_fan" ON "public"."subscriptions" FOR INSERT WITH CHECK (("auth"."uid"() = "fan_id"));



CREATE POLICY "subs_select_own" ON "public"."subscriptions" FOR SELECT USING ((("auth"."uid"() = "fan_id") OR ("auth"."uid"() = "creator_id")));



CREATE POLICY "subs_update_fan_cancel" ON "public"."subscriptions" FOR UPDATE USING (("auth"."uid"() = "fan_id")) WITH CHECK ((("auth"."uid"() = "fan_id") AND ("status" = 'cancelled'::"text")));



ALTER TABLE "public"."subscriptions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."system_config" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "system_config_admin" ON "public"."system_config" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text")))));



CREATE POLICY "tx_admin_read" ON "public"."_archived_token_transactions" FOR SELECT USING ("public"."is_admin"());



CREATE POLICY "tx_select_own" ON "public"."_archived_token_transactions" FOR SELECT USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."user_profiles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "user_profiles_admin_read" ON "public"."user_profiles" FOR SELECT USING ("public"."is_admin"());



CREATE POLICY "user_profiles_owner_all" ON "public"."user_profiles" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."user_reports" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "user_reports_admin_read" ON "public"."user_reports" FOR SELECT USING ("public"."is_admin"());



CREATE POLICY "user_reports_admin_update" ON "public"."user_reports" FOR UPDATE USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "user_reports_insert" ON "public"."user_reports" FOR INSERT WITH CHECK (("reporter_id" = "auth"."uid"()));



CREATE POLICY "user_reports_owner_read" ON "public"."user_reports" FOR SELECT USING (("reporter_id" = "auth"."uid"()));



ALTER TABLE "public"."webhook_events" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "webhook_events_admin_only" ON "public"."_archived_webhook_events" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text")))));





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";






ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."direct_messages";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."live_chat_messages";



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";






















































































































































GRANT ALL ON FUNCTION "public"."_log_access"() TO "anon";
GRANT ALL ON FUNCTION "public"."_log_access"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."_log_access"() TO "service_role";



GRANT ALL ON FUNCTION "public"."check_plan_limit"("p_creator_id" "uuid", "p_kind" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."check_plan_limit"("p_creator_id" "uuid", "p_kind" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_plan_limit"("p_creator_id" "uuid", "p_kind" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."compute_creator_kpi"("p_creator_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."compute_creator_kpi"("p_creator_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."compute_creator_kpi"("p_creator_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."confirm_plan_purchase"("p_order_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."confirm_plan_purchase"("p_order_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."confirm_plan_purchase"("p_order_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."confirm_token_purchase"("p_order_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."confirm_token_purchase"("p_order_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."confirm_token_purchase"("p_order_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."cron_cleanup_course_drafts"() TO "anon";
GRANT ALL ON FUNCTION "public"."cron_cleanup_course_drafts"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cron_cleanup_course_drafts"() TO "service_role";



GRANT ALL ON FUNCTION "public"."cron_expire_platform_subscriptions"() TO "anon";
GRANT ALL ON FUNCTION "public"."cron_expire_platform_subscriptions"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cron_expire_platform_subscriptions"() TO "service_role";



GRANT ALL ON FUNCTION "public"."cron_recompute_all_kpi"() TO "anon";
GRANT ALL ON FUNCTION "public"."cron_recompute_all_kpi"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cron_recompute_all_kpi"() TO "service_role";



GRANT ALL ON FUNCTION "public"."cron_snapshot_kpi_daily"() TO "anon";
GRANT ALL ON FUNCTION "public"."cron_snapshot_kpi_daily"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cron_snapshot_kpi_daily"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."fail_payment_order"("p_order_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fail_payment_order"("p_order_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fail_payment_order"("p_order_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."gdpr_data_retention_cleanup"() TO "anon";
GRANT ALL ON FUNCTION "public"."gdpr_data_retention_cleanup"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."gdpr_data_retention_cleanup"() TO "service_role";



GRANT ALL ON FUNCTION "public"."grant_creator_welcome_plan"() TO "anon";
GRANT ALL ON FUNCTION "public"."grant_creator_welcome_plan"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."grant_creator_welcome_plan"() TO "service_role";



GRANT ALL ON FUNCTION "public"."grant_platform_trial"() TO "anon";
GRANT ALL ON FUNCTION "public"."grant_platform_trial"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."grant_platform_trial"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."increment_coupon_usage"("coupon_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."increment_coupon_usage"("coupon_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."increment_coupon_usage"("coupon_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_admin"("uid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_admin"("uid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_admin"("uid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."prevent_dob_update"() TO "anon";
GRANT ALL ON FUNCTION "public"."prevent_dob_update"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."prevent_dob_update"() TO "service_role";



GRANT ALL ON FUNCTION "public"."protect_role_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."protect_role_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."protect_role_column"() TO "service_role";



GRANT ALL ON FUNCTION "public"."purge_old_audit_logs"("retention_days" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."purge_old_audit_logs"("retention_days" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."purge_old_audit_logs"("retention_days" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."rpc_create_live_session"("p_title" "text", "p_category" "text", "p_sub_only" boolean, "p_donations_enabled" boolean, "p_min_donation" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_create_live_session"("p_title" "text", "p_category" "text", "p_sub_only" boolean, "p_donations_enabled" boolean, "p_min_donation" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_create_live_session"("p_title" "text", "p_category" "text", "p_sub_only" boolean, "p_donations_enabled" boolean, "p_min_donation" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."set_email_preferences_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_email_preferences_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_email_preferences_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."touch_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."touch_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."touch_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_post_comments_count"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_post_comments_count"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_post_comments_count"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_post_likes_count"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_post_likes_count"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_post_likes_count"() TO "service_role";


















GRANT ALL ON TABLE "public"."_archived_financial_logs" TO "anon";
GRANT ALL ON TABLE "public"."_archived_financial_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."_archived_financial_logs" TO "service_role";



GRANT ALL ON TABLE "public"."_archived_fraud_logs" TO "anon";
GRANT ALL ON TABLE "public"."_archived_fraud_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."_archived_fraud_logs" TO "service_role";



GRANT ALL ON TABLE "public"."_archived_payment_orders" TO "anon";
GRANT ALL ON TABLE "public"."_archived_payment_orders" TO "authenticated";
GRANT ALL ON TABLE "public"."_archived_payment_orders" TO "service_role";



GRANT ALL ON TABLE "public"."_archived_payout_requests" TO "anon";
GRANT ALL ON TABLE "public"."_archived_payout_requests" TO "authenticated";
GRANT ALL ON TABLE "public"."_archived_payout_requests" TO "service_role";



GRANT ALL ON TABLE "public"."_archived_token_transactions" TO "anon";
GRANT ALL ON TABLE "public"."_archived_token_transactions" TO "authenticated";
GRANT ALL ON TABLE "public"."_archived_token_transactions" TO "service_role";



GRANT ALL ON TABLE "public"."_archived_webhook_events" TO "anon";
GRANT ALL ON TABLE "public"."_archived_webhook_events" TO "authenticated";
GRANT ALL ON TABLE "public"."_archived_webhook_events" TO "service_role";



GRANT ALL ON TABLE "public"."access_logs" TO "anon";
GRANT ALL ON TABLE "public"."access_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."access_logs" TO "service_role";



GRANT ALL ON SEQUENCE "public"."access_logs_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."access_logs_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."access_logs_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."admin_notifications" TO "anon";
GRANT ALL ON TABLE "public"."admin_notifications" TO "authenticated";
GRANT ALL ON TABLE "public"."admin_notifications" TO "service_role";



GRANT ALL ON TABLE "public"."audit_log" TO "anon";
GRANT ALL ON TABLE "public"."audit_log" TO "authenticated";
GRANT ALL ON TABLE "public"."audit_log" TO "service_role";



GRANT ALL ON TABLE "public"."breach_log" TO "anon";
GRANT ALL ON TABLE "public"."breach_log" TO "authenticated";
GRANT ALL ON TABLE "public"."breach_log" TO "service_role";



GRANT ALL ON TABLE "public"."broadcasts" TO "anon";
GRANT ALL ON TABLE "public"."broadcasts" TO "authenticated";
GRANT ALL ON TABLE "public"."broadcasts" TO "service_role";



GRANT ALL ON TABLE "public"."certificates" TO "anon";
GRANT ALL ON TABLE "public"."certificates" TO "authenticated";
GRANT ALL ON TABLE "public"."certificates" TO "service_role";



GRANT ALL ON TABLE "public"."community_posts" TO "anon";
GRANT ALL ON TABLE "public"."community_posts" TO "authenticated";
GRANT ALL ON TABLE "public"."community_posts" TO "service_role";



GRANT ALL ON TABLE "public"."consent_log" TO "anon";
GRANT ALL ON TABLE "public"."consent_log" TO "authenticated";
GRANT ALL ON TABLE "public"."consent_log" TO "service_role";



GRANT ALL ON TABLE "public"."content_behaviors" TO "anon";
GRANT ALL ON TABLE "public"."content_behaviors" TO "authenticated";
GRANT ALL ON TABLE "public"."content_behaviors" TO "service_role";



GRANT ALL ON TABLE "public"."coupons" TO "anon";
GRANT ALL ON TABLE "public"."coupons" TO "authenticated";
GRANT ALL ON TABLE "public"."coupons" TO "service_role";



GRANT ALL ON TABLE "public"."course_access" TO "anon";
GRANT ALL ON TABLE "public"."course_access" TO "authenticated";
GRANT ALL ON TABLE "public"."course_access" TO "service_role";



GRANT ALL ON TABLE "public"."course_drafts" TO "anon";
GRANT ALL ON TABLE "public"."course_drafts" TO "authenticated";
GRANT ALL ON TABLE "public"."course_drafts" TO "service_role";



GRANT ALL ON TABLE "public"."course_lessons" TO "anon";
GRANT ALL ON TABLE "public"."course_lessons" TO "authenticated";
GRANT ALL ON TABLE "public"."course_lessons" TO "service_role";



GRANT ALL ON TABLE "public"."courses" TO "anon";
GRANT ALL ON TABLE "public"."courses" TO "authenticated";
GRANT ALL ON TABLE "public"."courses" TO "service_role";



GRANT ALL ON TABLE "public"."creator_kpi_aggregated" TO "anon";
GRANT ALL ON TABLE "public"."creator_kpi_aggregated" TO "authenticated";
GRANT ALL ON TABLE "public"."creator_kpi_aggregated" TO "service_role";



GRANT ALL ON TABLE "public"."creator_kpi_daily" TO "anon";
GRANT ALL ON TABLE "public"."creator_kpi_daily" TO "authenticated";
GRANT ALL ON TABLE "public"."creator_kpi_daily" TO "service_role";



GRANT ALL ON TABLE "public"."creator_plan_subscriptions" TO "anon";
GRANT ALL ON TABLE "public"."creator_plan_subscriptions" TO "authenticated";
GRANT ALL ON TABLE "public"."creator_plan_subscriptions" TO "service_role";



GRANT ALL ON TABLE "public"."creator_plans" TO "anon";
GRANT ALL ON TABLE "public"."creator_plans" TO "authenticated";
GRANT ALL ON TABLE "public"."creator_plans" TO "service_role";



GRANT ALL ON TABLE "public"."creator_profiles" TO "anon";
GRANT ALL ON TABLE "public"."creator_profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."creator_profiles" TO "service_role";



GRANT ALL ON TABLE "public"."creator_promo_grants" TO "anon";
GRANT ALL ON TABLE "public"."creator_promo_grants" TO "authenticated";
GRANT ALL ON TABLE "public"."creator_promo_grants" TO "service_role";



GRANT ALL ON TABLE "public"."creator_promo_counter" TO "anon";
GRANT ALL ON TABLE "public"."creator_promo_counter" TO "authenticated";
GRANT ALL ON TABLE "public"."creator_promo_counter" TO "service_role";



GRANT ALL ON TABLE "public"."creator_scores" TO "anon";
GRANT ALL ON TABLE "public"."creator_scores" TO "authenticated";
GRANT ALL ON TABLE "public"."creator_scores" TO "service_role";



GRANT ALL ON TABLE "public"."creator_segments" TO "anon";
GRANT ALL ON TABLE "public"."creator_segments" TO "authenticated";
GRANT ALL ON TABLE "public"."creator_segments" TO "service_role";



GRANT ALL ON TABLE "public"."cron_status" TO "anon";
GRANT ALL ON TABLE "public"."cron_status" TO "authenticated";
GRANT ALL ON TABLE "public"."cron_status" TO "service_role";



GRANT ALL ON TABLE "public"."data_export_requests" TO "anon";
GRANT ALL ON TABLE "public"."data_export_requests" TO "authenticated";
GRANT ALL ON TABLE "public"."data_export_requests" TO "service_role";



GRANT ALL ON TABLE "public"."deletion_requests" TO "anon";
GRANT ALL ON TABLE "public"."deletion_requests" TO "authenticated";
GRANT ALL ON TABLE "public"."deletion_requests" TO "service_role";



GRANT ALL ON TABLE "public"."direct_messages" TO "anon";
GRANT ALL ON TABLE "public"."direct_messages" TO "authenticated";
GRANT ALL ON TABLE "public"."direct_messages" TO "service_role";



GRANT ALL ON TABLE "public"."email_preferences" TO "anon";
GRANT ALL ON TABLE "public"."email_preferences" TO "authenticated";
GRANT ALL ON TABLE "public"."email_preferences" TO "service_role";



GRANT ALL ON TABLE "public"."follows" TO "anon";
GRANT ALL ON TABLE "public"."follows" TO "authenticated";
GRANT ALL ON TABLE "public"."follows" TO "service_role";



GRANT ALL ON TABLE "public"."lesson_completions" TO "anon";
GRANT ALL ON TABLE "public"."lesson_completions" TO "authenticated";
GRANT ALL ON TABLE "public"."lesson_completions" TO "service_role";



GRANT ALL ON TABLE "public"."live_access" TO "anon";
GRANT ALL ON TABLE "public"."live_access" TO "authenticated";
GRANT ALL ON TABLE "public"."live_access" TO "service_role";



GRANT ALL ON TABLE "public"."live_chat_messages" TO "anon";
GRANT ALL ON TABLE "public"."live_chat_messages" TO "authenticated";
GRANT ALL ON TABLE "public"."live_chat_messages" TO "service_role";



GRANT ALL ON TABLE "public"."live_events" TO "anon";
GRANT ALL ON TABLE "public"."live_events" TO "authenticated";
GRANT ALL ON TABLE "public"."live_events" TO "service_role";



GRANT ALL ON TABLE "public"."login_log" TO "anon";
GRANT ALL ON TABLE "public"."login_log" TO "authenticated";
GRANT ALL ON TABLE "public"."login_log" TO "service_role";



GRANT ALL ON TABLE "public"."notification_preferences" TO "anon";
GRANT ALL ON TABLE "public"."notification_preferences" TO "authenticated";
GRANT ALL ON TABLE "public"."notification_preferences" TO "service_role";



GRANT ALL ON TABLE "public"."notifications" TO "anon";
GRANT ALL ON TABLE "public"."notifications" TO "authenticated";
GRANT ALL ON TABLE "public"."notifications" TO "service_role";



GRANT ALL ON TABLE "public"."platform_subscriptions" TO "anon";
GRANT ALL ON TABLE "public"."platform_subscriptions" TO "authenticated";
GRANT ALL ON TABLE "public"."platform_subscriptions" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."subscriptions" TO "anon";
GRANT ALL ON TABLE "public"."subscriptions" TO "authenticated";
GRANT ALL ON TABLE "public"."subscriptions" TO "service_role";



GRANT ALL ON TABLE "public"."system_config" TO "anon";
GRANT ALL ON TABLE "public"."system_config" TO "authenticated";
GRANT ALL ON TABLE "public"."system_config" TO "service_role";



GRANT ALL ON TABLE "public"."user_profiles" TO "anon";
GRANT ALL ON TABLE "public"."user_profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."user_profiles" TO "service_role";



GRANT ALL ON TABLE "public"."user_reports" TO "anon";
GRANT ALL ON TABLE "public"."user_reports" TO "authenticated";
GRANT ALL ON TABLE "public"."user_reports" TO "service_role";



GRANT ALL ON TABLE "public"."webhook_events" TO "anon";
GRANT ALL ON TABLE "public"."webhook_events" TO "authenticated";
GRANT ALL ON TABLE "public"."webhook_events" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































drop extension if exists "pg_net";

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


  create policy "avatars_owner_insert"
  on "storage"."objects"
  as permissive
  for insert
  to public
with check (((bucket_id = 'avatars'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));



  create policy "avatars_owner_update"
  on "storage"."objects"
  as permissive
  for update
  to public
using (((bucket_id = 'avatars'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));



  create policy "avatars_public_read"
  on "storage"."objects"
  as permissive
  for select
  to public
using ((bucket_id = 'avatars'::text));



  create policy "certificates_objects_select"
  on "storage"."objects"
  as permissive
  for select
  to public
using (((bucket_id = 'certificates'::text) AND ((auth.uid())::text = (storage.foldername(name))[1])));



  create policy "documents_public_read"
  on "storage"."objects"
  as permissive
  for select
  to public
using ((bucket_id = 'documents'::text));



  create policy "images_public_read"
  on "storage"."objects"
  as permissive
  for select
  to public
using ((bucket_id = 'images'::text));



  create policy "media_authenticated_read"
  on "storage"."objects"
  as permissive
  for select
  to public
using (((bucket_id = 'media'::text) AND (auth.role() = 'authenticated'::text)));



  create policy "media_owner_insert"
  on "storage"."objects"
  as permissive
  for insert
  to authenticated
with check (((bucket_id = 'media'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));



  create policy "media_owner_update"
  on "storage"."objects"
  as permissive
  for update
  to authenticated
using (((bucket_id = 'media'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));



  create policy "videos_public_read"
  on "storage"."objects"
  as permissive
  for select
  to public
using ((bucket_id = 'videos'::text));



