-- =====================================================================
-- Tokaro.fans — Production Monetization Upgrade
-- Single source of truth for economic constants, platform fee, holding
-- period, KYC, fraud detection, webhook logging.
-- Safe to run multiple times (idempotent).
-- =====================================================================

-- =====================================================================
-- 1. MONETIZATION CONFIG TABLE (single source of truth)
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.monetization_config (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.monetization_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "config_select_all" ON public.monetization_config;
CREATE POLICY "config_select_all" ON public.monetization_config FOR SELECT USING (true);

DROP POLICY IF EXISTS "config_update_admin" ON public.monetization_config;
CREATE POLICY "config_update_admin" ON public.monetization_config
  FOR UPDATE USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

INSERT INTO public.monetization_config (key, value) VALUES
  ('platform_fee_percent', '15'::jsonb),
  ('payout_rate_eur', '0.10'::jsonb),
  ('min_payout_eur', '50'::jsonb),
  ('holding_period_days', '7'::jsonb),
  ('max_spend_per_minute', '500'::jsonb)
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();

-- Helper to read config as numeric
CREATE OR REPLACE FUNCTION public.mconfig(p_key text)
RETURNS numeric LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT (value #>> '{}')::numeric FROM monetization_config WHERE key = p_key;
$$;

-- =====================================================================
-- 2. PLATFORM WALLET
-- =====================================================================

-- Extend wallet_type to include 'platform'
ALTER TABLE public.token_wallets DROP CONSTRAINT IF EXISTS token_wallets_wallet_type_check;
ALTER TABLE public.token_wallets ADD CONSTRAINT token_wallets_wallet_type_check
  CHECK (wallet_type IN ('user', 'creator', 'platform'));

-- Platform system user (needed for FK)
INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token)
VALUES ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'platform@tokaro.fans', '', now(), now(), now(), '', '', '', '')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.token_wallets (user_id, wallet_type, balance, total_earned, total_spent)
VALUES ('00000000-0000-0000-0000-000000000000'::uuid, 'platform', 0, 0, 0)
ON CONFLICT (user_id, wallet_type) DO NOTHING;

-- =====================================================================
-- 3. HOLDING PERIOD — add available_at to token_transactions
-- =====================================================================
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'token_transactions' AND column_name = 'available_at'
  ) THEN
    ALTER TABLE public.token_transactions ADD COLUMN available_at timestamptz;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS tx_available_at_idx
  ON public.token_transactions(user_id, wallet_type, available_at)
  WHERE wallet_type = 'creator' AND type = 'earn';

-- =====================================================================
-- 4. KYC — add kyc_status to profiles
-- =====================================================================
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'kyc_status'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN kyc_status text NOT NULL DEFAULT 'none'
      CHECK (kyc_status IN ('none', 'pending', 'approved', 'rejected'));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'kyc_document_url'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN kyc_document_url text;
  END IF;
END $$;

-- =====================================================================
-- 5. PAYOUT REQUESTS — add available_at
-- =====================================================================
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'payout_requests' AND column_name = 'available_at'
  ) THEN
    ALTER TABLE public.payout_requests ADD COLUMN available_at timestamptz;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'payout_requests' AND column_name = 'creator_email'
  ) THEN
    ALTER TABLE public.payout_requests ADD COLUMN creator_email text;
  END IF;
END $$;

-- =====================================================================
-- 6. WEBHOOK EVENTS LOG
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL,
  event_type text NOT NULL,
  event_id text,
  payload jsonb NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'received' CHECK (status IN ('received', 'processed', 'failed', 'ignored')),
  error_message text,
  order_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz
);

CREATE INDEX IF NOT EXISTS webhook_events_provider_idx ON public.webhook_events(provider, created_at DESC);
CREATE INDEX IF NOT EXISTS webhook_events_event_id_idx ON public.webhook_events(event_id);
CREATE INDEX IF NOT EXISTS webhook_events_order_idx ON public.webhook_events(order_id);

ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "webhook_events_admin_only" ON public.webhook_events;
CREATE POLICY "webhook_events_admin_only" ON public.webhook_events
  FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- =====================================================================
-- 7. FRAUD LOGS
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.fraud_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  event_type text NOT NULL,
  severity text NOT NULL DEFAULT 'low' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  details jsonb NOT NULL DEFAULT '{}',
  resolved boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS fraud_logs_user_idx ON public.fraud_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS fraud_logs_severity_idx ON public.fraud_logs(severity, resolved, created_at DESC);

ALTER TABLE public.fraud_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "fraud_logs_admin_only" ON public.fraud_logs;
CREATE POLICY "fraud_logs_admin_only" ON public.fraud_logs
  FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- =====================================================================
-- 8. FINANCIAL LOGS (audit trail)
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.financial_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action text NOT NULL,
  actor_id uuid,
  target_id uuid,
  amount_tokens integer,
  amount_eur numeric(10,2),
  details jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS financial_logs_action_idx ON public.financial_logs(action, created_at DESC);
CREATE INDEX IF NOT EXISTS financial_logs_actor_idx ON public.financial_logs(actor_id, created_at DESC);

ALTER TABLE public.financial_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "financial_logs_admin_only" ON public.financial_logs;
CREATE POLICY "financial_logs_admin_only" ON public.financial_logs
  FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- =====================================================================
-- 9. TOKEN PACKS TABLE (single source of truth for packs)
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.token_packs (
  code text PRIMARY KEY,
  tokens integer NOT NULL,
  price_eur numeric(10,2) NOT NULL,
  active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.token_packs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "token_packs_select_all" ON public.token_packs;
CREATE POLICY "token_packs_select_all" ON public.token_packs FOR SELECT USING (true);

INSERT INTO public.token_packs (code, tokens, price_eur, sort_order) VALUES
  ('pack_80',  80,  10.00, 1),
  ('pack_120', 120, 15.00, 2),
  ('pack_160', 160, 20.00, 3),
  ('pack_200', 200, 25.00, 4),
  ('pack_420', 420, 50.00, 5),
  ('pack_850', 850, 100.00, 6)
ON CONFLICT (code) DO UPDATE SET
  tokens = EXCLUDED.tokens,
  price_eur = EXCLUDED.price_eur,
  sort_order = EXCLUDED.sort_order;

-- =====================================================================
-- 10. HELPER: credit platform wallet (internal, not callable by users)
-- =====================================================================
CREATE OR REPLACE FUNCTION public._credit_platform(p_amount integer, p_description text, p_ref_id text, p_ref_type text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_platform_wallet_id uuid;
BEGIN
  IF p_amount <= 0 THEN RETURN; END IF;

  SELECT id INTO v_platform_wallet_id FROM token_wallets
    WHERE user_id = '00000000-0000-0000-0000-000000000000'::uuid AND wallet_type = 'platform';

  IF v_platform_wallet_id IS NULL THEN
    INSERT INTO token_wallets (user_id, wallet_type, balance, total_earned, total_spent)
    VALUES ('00000000-0000-0000-0000-000000000000'::uuid, 'platform', 0, 0, 0)
    RETURNING id INTO v_platform_wallet_id;
  END IF;

  UPDATE token_wallets
  SET balance = balance + p_amount, total_earned = total_earned + p_amount, updated_at = now()
  WHERE id = v_platform_wallet_id;

  INSERT INTO token_transactions (user_id, wallet_type, type, amount, description, ref_id, ref_type)
  VALUES ('00000000-0000-0000-0000-000000000000'::uuid, 'platform', 'earn', p_amount, p_description, p_ref_id, p_ref_type);
END;
$$;

REVOKE ALL ON FUNCTION public._credit_platform(integer, text, text, text) FROM PUBLIC, authenticated, anon;

-- =====================================================================
-- 11. HELPER: credit creator with holding period
-- =====================================================================
CREATE OR REPLACE FUNCTION public._credit_creator_with_hold(
  p_creator_id uuid,
  p_amount integer,
  p_description text,
  p_ref_id text,
  p_ref_type text
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_wallet_id uuid;
  v_hold_days integer;
BEGIN
  IF p_amount <= 0 THEN RETURN; END IF;

  v_hold_days := COALESCE(mconfig('holding_period_days')::integer, 7);

  SELECT id INTO v_wallet_id FROM token_wallets
    WHERE user_id = p_creator_id AND wallet_type = 'creator';

  IF v_wallet_id IS NULL THEN
    INSERT INTO token_wallets (user_id, wallet_type, balance, total_earned, total_spent)
    VALUES (p_creator_id, 'creator', 0, 0, 0)
    RETURNING id INTO v_wallet_id;
  END IF;

  UPDATE token_wallets
  SET balance = balance + p_amount, total_earned = total_earned + p_amount, updated_at = now()
  WHERE id = v_wallet_id;

  INSERT INTO token_transactions (user_id, wallet_type, type, amount, description, ref_id, ref_type, available_at)
  VALUES (p_creator_id, 'creator', 'earn', p_amount, p_description, p_ref_id, p_ref_type,
          now() + (v_hold_days || ' days')::interval);
END;
$$;

REVOKE ALL ON FUNCTION public._credit_creator_with_hold(uuid, integer, text, text, text) FROM PUBLIC, authenticated, anon;

-- =====================================================================
-- 12. HELPER: log fraud event
-- =====================================================================
CREATE OR REPLACE FUNCTION public._log_fraud(
  p_user_id uuid,
  p_event_type text,
  p_severity text,
  p_details jsonb
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO fraud_logs (user_id, event_type, severity, details)
  VALUES (p_user_id, p_event_type, p_severity, p_details);
END;
$$;

REVOKE ALL ON FUNCTION public._log_fraud(uuid, text, text, jsonb) FROM PUBLIC, authenticated, anon;

-- =====================================================================
-- 13. HELPER: available balance for payout (only matured earnings)
-- =====================================================================
CREATE OR REPLACE FUNCTION public.get_available_balance(p_creator_id uuid)
RETURNS integer LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_total_earned integer;
  v_locked integer;
  v_total_debited integer;
  v_available integer;
BEGIN
  SELECT COALESCE(SUM(amount), 0) INTO v_total_earned
  FROM token_transactions
  WHERE user_id = p_creator_id AND wallet_type = 'creator' AND type = 'earn';

  SELECT COALESCE(SUM(amount), 0) INTO v_locked
  FROM token_transactions
  WHERE user_id = p_creator_id AND wallet_type = 'creator' AND type = 'earn'
    AND available_at IS NOT NULL AND available_at > now();

  SELECT COALESCE(SUM(ABS(amount)), 0) INTO v_total_debited
  FROM token_transactions
  WHERE user_id = p_creator_id AND wallet_type = 'creator' AND type IN ('payout', 'refund')
    AND amount < 0;

  v_available := v_total_earned - v_locked - v_total_debited;
  RETURN GREATEST(v_available, 0);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_available_balance(uuid) TO authenticated, service_role;

-- =====================================================================
-- 14. REWRITE: rpc_subscribe WITH PLATFORM FEE
-- =====================================================================
CREATE OR REPLACE FUNCTION public.rpc_subscribe(
  p_creator_id uuid,
  p_tier text DEFAULT 'base'
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid uuid;
  v_plan text;
  v_cost integer;
  v_fee_pct numeric;
  v_creator_share integer;
  v_platform_share integer;
  v_fan_wallet record;
  v_expires timestamptz;
  v_sub_id uuid;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Non autenticato'; END IF;
  IF p_creator_id = v_uid THEN RAISE EXCEPTION 'Non puoi abbonarti a te stesso'; END IF;
  IF p_tier NOT IN ('base', 'premium') THEN RAISE EXCEPTION 'Tier non valido'; END IF;

  SELECT plan INTO v_plan FROM profiles WHERE id = p_creator_id;
  IF v_plan IS NULL THEN RAISE EXCEPTION 'Creator non trovato'; END IF;
  IF v_plan NOT IN ('start', 'pro') THEN
    RAISE EXCEPTION 'Questo creator non può ricevere abbonamenti con il piano attuale';
  END IF;

  v_cost := CASE WHEN p_tier = 'premium' THEN 200 ELSE 100 END;
  v_fee_pct := COALESCE(mconfig('platform_fee_percent'), 15);
  v_platform_share := GREATEST(round(v_cost * v_fee_pct / 100)::integer, 0);
  v_creator_share := v_cost - v_platform_share;

  -- Debit fan
  SELECT * INTO v_fan_wallet FROM token_wallets
    WHERE user_id = v_uid AND wallet_type = 'user' FOR UPDATE;
  IF NOT FOUND OR v_fan_wallet.balance < v_cost THEN
    RAISE EXCEPTION 'Saldo insufficiente';
  END IF;

  UPDATE token_wallets
  SET balance = balance - v_cost, total_spent = total_spent + v_cost, updated_at = now()
  WHERE id = v_fan_wallet.id;

  INSERT INTO token_transactions (user_id, wallet_type, type, amount, description, ref_id, ref_type)
  VALUES (v_uid, 'user', 'spend', -v_cost, 'Abbonamento ' || p_tier || ' creator', p_creator_id::text, 'subscription');

  -- Credit creator (85%)
  PERFORM _credit_creator_with_hold(p_creator_id, v_creator_share,
    'Abbonamento ' || p_tier || ' da fan (' || v_creator_share || '/' || v_cost || ')',
    v_uid::text, 'subscription');

  -- Credit platform (15%)
  PERFORM _credit_platform(v_platform_share,
    'Fee abbonamento ' || p_tier, v_uid::text, 'subscription');

  -- Upsert subscription
  v_expires := now() + interval '30 days';

  SELECT id INTO v_sub_id FROM subscriptions
    WHERE fan_id = v_uid AND creator_id = p_creator_id AND status = 'active';

  IF v_sub_id IS NOT NULL THEN
    UPDATE subscriptions
    SET tier = p_tier, expires_at = v_expires, updated_at = now()
    WHERE id = v_sub_id;
  ELSE
    INSERT INTO subscriptions (fan_id, creator_id, tier, status, started_at, expires_at)
    VALUES (v_uid, p_creator_id, p_tier, 'active', now(), v_expires)
    RETURNING id INTO v_sub_id;
  END IF;

  -- Financial log
  INSERT INTO financial_logs (action, actor_id, target_id, amount_tokens, details)
  VALUES ('subscription', v_uid, p_creator_id, v_cost,
    jsonb_build_object('tier', p_tier, 'creator_share', v_creator_share, 'platform_share', v_platform_share));

  RETURN jsonb_build_object(
    'tier', p_tier, 'cost', v_cost,
    'creator_share', v_creator_share, 'platform_share', v_platform_share,
    'expires_at', v_expires, 'subscription_id', v_sub_id
  );
END;
$$;

-- =====================================================================
-- 15. REWRITE: rpc_unlock_content WITH PLATFORM FEE
-- =====================================================================
CREATE OR REPLACE FUNCTION public.rpc_unlock_content(p_post_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid uuid;
  v_post record;
  v_plan text;
  v_price integer;
  v_fee_pct numeric;
  v_creator_share integer;
  v_platform_share integer;
  v_fan_wallet record;
  v_existing_unlock uuid;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Non autenticato'; END IF;

  SELECT id, creator_id, price, access INTO v_post FROM posts WHERE id = p_post_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Contenuto non trovato'; END IF;
  IF v_post.creator_id = v_uid THEN RETURN jsonb_build_object('already_unlocked', true); END IF;
  IF v_post.price IS NULL OR v_post.price <= 0 THEN RAISE EXCEPTION 'Contenuto senza prezzo'; END IF;

  SELECT plan INTO v_plan FROM profiles WHERE id = v_post.creator_id;
  IF v_plan NOT IN ('start', 'pro') THEN
    RAISE EXCEPTION 'Questo creator non può ricevere token con il piano attuale';
  END IF;

  SELECT id INTO v_existing_unlock FROM content_unlocks WHERE fan_id = v_uid AND post_id = p_post_id;
  IF FOUND THEN RETURN jsonb_build_object('already_unlocked', true); END IF;

  v_price := round(v_post.price)::integer;
  v_fee_pct := COALESCE(mconfig('platform_fee_percent'), 15);
  v_platform_share := GREATEST(round(v_price * v_fee_pct / 100)::integer, 0);
  v_creator_share := v_price - v_platform_share;

  -- Debit fan
  SELECT * INTO v_fan_wallet FROM token_wallets
    WHERE user_id = v_uid AND wallet_type = 'user' FOR UPDATE;
  IF NOT FOUND OR v_fan_wallet.balance < v_price THEN RAISE EXCEPTION 'Saldo insufficiente'; END IF;

  UPDATE token_wallets
  SET balance = balance - v_price, total_spent = total_spent + v_price, updated_at = now()
  WHERE id = v_fan_wallet.id;

  INSERT INTO token_transactions (user_id, wallet_type, type, amount, description, ref_id, ref_type)
  VALUES (v_uid, 'user', 'spend', -v_price, 'Sblocco contenuto', p_post_id::text, 'unlock');

  PERFORM _credit_creator_with_hold(v_post.creator_id, v_creator_share,
    'Sblocco contenuto da fan (' || v_creator_share || '/' || v_price || ')', p_post_id::text, 'unlock');
  PERFORM _credit_platform(v_platform_share, 'Fee sblocco contenuto', p_post_id::text, 'unlock');

  INSERT INTO content_unlocks (fan_id, post_id, tokens_paid) VALUES (v_uid, p_post_id, v_price);

  INSERT INTO financial_logs (action, actor_id, target_id, amount_tokens, details)
  VALUES ('unlock', v_uid, v_post.creator_id, v_price,
    jsonb_build_object('post_id', p_post_id, 'creator_share', v_creator_share, 'platform_share', v_platform_share));

  RETURN jsonb_build_object('already_unlocked', false, 'tokens_paid', v_price,
    'creator_share', v_creator_share, 'platform_share', v_platform_share);
END;
$$;

-- =====================================================================
-- 16. REWRITE: rpc_paid_message WITH PLATFORM FEE
-- =====================================================================
CREATE OR REPLACE FUNCTION public.rpc_paid_message(p_creator_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid uuid;
  v_plan text;
  v_cost integer := 1;
  v_fee_pct numeric;
  v_creator_share integer;
  v_platform_share integer;
  v_fan_wallet record;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Non autenticato'; END IF;

  SELECT plan INTO v_plan FROM profiles WHERE id = p_creator_id;
  IF v_plan IS NULL THEN RAISE EXCEPTION 'Creator non trovato'; END IF;
  IF v_plan NOT IN ('start', 'pro') THEN RETURN jsonb_build_object('cost', 0); END IF;

  v_fee_pct := COALESCE(mconfig('platform_fee_percent'), 15);
  -- For 1 token: platform gets 0, creator gets 1 (minimum 1 token indivisible)
  v_platform_share := GREATEST(round(v_cost * v_fee_pct / 100)::integer, 0);
  v_creator_share := v_cost - v_platform_share;

  SELECT * INTO v_fan_wallet FROM token_wallets
    WHERE user_id = v_uid AND wallet_type = 'user' FOR UPDATE;
  IF NOT FOUND OR v_fan_wallet.balance < v_cost THEN RAISE EXCEPTION 'Saldo insufficiente'; END IF;

  UPDATE token_wallets
  SET balance = balance - v_cost, total_spent = total_spent + v_cost, updated_at = now()
  WHERE id = v_fan_wallet.id;

  INSERT INTO token_transactions (user_id, wallet_type, type, amount, description, ref_id, ref_type)
  VALUES (v_uid, 'user', 'spend', -v_cost, 'Messaggio a creator', p_creator_id::text, 'dm');

  IF v_creator_share > 0 THEN
    PERFORM _credit_creator_with_hold(p_creator_id, v_creator_share,
      'Messaggio da fan', v_uid::text, 'dm');
  END IF;
  IF v_platform_share > 0 THEN
    PERFORM _credit_platform(v_platform_share, 'Fee messaggio', v_uid::text, 'dm');
  END IF;

  RETURN jsonb_build_object('cost', v_cost);
END;
$$;

-- =====================================================================
-- 17. REWRITE: rpc_donate WITH PLATFORM FEE + FRAUD CHECK
-- =====================================================================
CREATE OR REPLACE FUNCTION public.rpc_donate(
  p_creator_id uuid,
  p_amount integer,
  p_live_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid uuid;
  v_plan text;
  v_fee_pct numeric;
  v_creator_share integer;
  v_platform_share integer;
  v_fan_wallet record;
  v_ref_id text;
  v_desc text;
  v_recent_donations integer;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Non autenticato'; END IF;
  IF p_amount <= 0 OR p_amount > 100000 THEN RAISE EXCEPTION 'Importo non valido'; END IF;

  SELECT plan INTO v_plan FROM profiles WHERE id = p_creator_id;
  IF v_plan IS NULL THEN RAISE EXCEPTION 'Creator non trovato'; END IF;
  IF v_plan NOT IN ('start', 'pro') THEN
    RAISE EXCEPTION 'Questo creator non può ricevere donazioni con il piano attuale';
  END IF;

  -- Fraud check: too many donations in 5 minutes
  SELECT count(*) INTO v_recent_donations FROM token_transactions
    WHERE user_id = v_uid AND wallet_type = 'user' AND ref_type = 'donation'
    AND created_at > now() - interval '5 minutes';
  IF v_recent_donations >= 10 THEN
    PERFORM _log_fraud(v_uid, 'rapid_donations', 'medium',
      jsonb_build_object('count_5min', v_recent_donations, 'amount', p_amount));
    RAISE EXCEPTION 'Troppe donazioni ravvicinate. Riprova tra qualche minuto.';
  END IF;

  v_fee_pct := COALESCE(mconfig('platform_fee_percent'), 15);
  v_platform_share := GREATEST(round(p_amount * v_fee_pct / 100)::integer, 0);
  v_creator_share := p_amount - v_platform_share;

  v_ref_id := COALESCE(p_live_id::text, p_creator_id::text);
  v_desc := CASE WHEN p_live_id IS NOT NULL THEN 'Donazione live' ELSE 'Donazione a creator' END;

  -- Debit fan
  SELECT * INTO v_fan_wallet FROM token_wallets
    WHERE user_id = v_uid AND wallet_type = 'user' FOR UPDATE;
  IF NOT FOUND OR v_fan_wallet.balance < p_amount THEN RAISE EXCEPTION 'Saldo insufficiente'; END IF;

  UPDATE token_wallets
  SET balance = balance - p_amount, total_spent = total_spent + p_amount, updated_at = now()
  WHERE id = v_fan_wallet.id;

  INSERT INTO token_transactions (user_id, wallet_type, type, amount, description, ref_id, ref_type)
  VALUES (v_uid, 'user', 'spend', -p_amount, v_desc, v_ref_id, 'donation');

  PERFORM _credit_creator_with_hold(p_creator_id, v_creator_share,
    v_desc || ' (' || v_creator_share || '/' || p_amount || ')', v_ref_id, 'donation');
  PERFORM _credit_platform(v_platform_share, 'Fee donazione', v_ref_id, 'donation');

  IF p_live_id IS NOT NULL THEN
    UPDATE live_sessions SET total_donations = COALESCE(total_donations, 0) + p_amount WHERE id = p_live_id;
  END IF;

  INSERT INTO financial_logs (action, actor_id, target_id, amount_tokens, details)
  VALUES ('donation', v_uid, p_creator_id, p_amount,
    jsonb_build_object('live_id', p_live_id, 'creator_share', v_creator_share, 'platform_share', v_platform_share));

  RETURN jsonb_build_object('amount', p_amount,
    'creator_share', v_creator_share, 'platform_share', v_platform_share);
END;
$$;

-- =====================================================================
-- 18. REWRITE: rpc_live_access WITH PLATFORM FEE
-- =====================================================================
CREATE OR REPLACE FUNCTION public.rpc_live_access(p_live_id uuid, p_amount integer)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid uuid;
  v_session record;
  v_plan text;
  v_fee_pct numeric;
  v_creator_share integer;
  v_platform_share integer;
  v_fan_wallet record;
  v_existing bigint;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Non autenticato'; END IF;
  IF p_amount <= 0 THEN RAISE EXCEPTION 'Importo non valido'; END IF;

  SELECT id, creator_id INTO v_session FROM live_sessions WHERE id = p_live_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Live non trovata'; END IF;

  SELECT plan INTO v_plan FROM profiles WHERE id = v_session.creator_id;
  IF v_plan NOT IN ('start', 'pro') THEN RAISE EXCEPTION 'Questa live non è disponibile'; END IF;

  SELECT count(*) INTO v_existing FROM token_transactions
    WHERE user_id = v_uid AND type = 'spend' AND ref_id = 'live:' || p_live_id::text;
  IF v_existing > 0 THEN RETURN jsonb_build_object('already_owned', true); END IF;

  v_fee_pct := COALESCE(mconfig('platform_fee_percent'), 15);
  v_platform_share := GREATEST(round(p_amount * v_fee_pct / 100)::integer, 0);
  v_creator_share := p_amount - v_platform_share;

  SELECT * INTO v_fan_wallet FROM token_wallets
    WHERE user_id = v_uid AND wallet_type = 'user' FOR UPDATE;
  IF NOT FOUND OR v_fan_wallet.balance < p_amount THEN RAISE EXCEPTION 'Saldo insufficiente'; END IF;

  UPDATE token_wallets
  SET balance = balance - p_amount, total_spent = total_spent + p_amount, updated_at = now()
  WHERE id = v_fan_wallet.id;

  INSERT INTO token_transactions (user_id, wallet_type, type, amount, description, ref_id, ref_type)
  VALUES (v_uid, 'user', 'spend', -p_amount, 'Accesso live', 'live:' || p_live_id::text, 'live_access');

  PERFORM _credit_creator_with_hold(v_session.creator_id, v_creator_share,
    'Accesso live da fan (' || v_creator_share || '/' || p_amount || ')', 'live:' || p_live_id::text, 'live_access');
  PERFORM _credit_platform(v_platform_share, 'Fee accesso live', 'live:' || p_live_id::text, 'live_access');

  INSERT INTO financial_logs (action, actor_id, target_id, amount_tokens, details)
  VALUES ('live_access', v_uid, v_session.creator_id, p_amount,
    jsonb_build_object('live_id', p_live_id, 'creator_share', v_creator_share, 'platform_share', v_platform_share));

  RETURN jsonb_build_object('already_owned', false,
    'creator_share', v_creator_share, 'platform_share', v_platform_share);
END;
$$;

-- =====================================================================
-- 19. REWRITE: wallet_request_payout WITH HOLDING + KYC + PAYOUT_METHOD
-- =====================================================================
CREATE OR REPLACE FUNCTION public.wallet_request_payout(
  p_token_amount integer,
  p_notes text DEFAULT ''
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid uuid;
  v_wallet record;
  v_profile record;
  v_payout_rate numeric;
  v_min_eur numeric;
  v_euro numeric(10,2);
  v_available integer;
  v_payout record;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Non autenticato'; END IF;
  IF p_token_amount <= 0 THEN RAISE EXCEPTION 'Importo non valido'; END IF;

  -- Check profile: KYC + payout method
  SELECT kyc_status, payout_method INTO v_profile FROM profiles WHERE id = v_uid;

  IF v_profile.kyc_status IS DISTINCT FROM 'approved' THEN
    RAISE EXCEPTION 'Verifica identità (KYC) richiesta prima di richiedere un payout. Vai nelle impostazioni per completarla.';
  END IF;

  IF v_profile.payout_method IS NULL OR v_profile.payout_method = '{}'::jsonb THEN
    RAISE EXCEPTION 'Inserisci un metodo di pagamento (IBAN) nelle impostazioni prima di richiedere un payout.';
  END IF;

  -- Read config
  v_payout_rate := COALESCE(mconfig('payout_rate_eur'), 0.10);
  v_min_eur := COALESCE(mconfig('min_payout_eur'), 50);

  -- Lock wallet
  SELECT * INTO v_wallet FROM token_wallets
    WHERE user_id = v_uid AND wallet_type = 'creator' FOR UPDATE;

  IF NOT FOUND OR v_wallet.balance < p_token_amount THEN
    RAISE EXCEPTION 'Saldo creator insufficiente';
  END IF;

  -- Check available (matured) balance
  v_available := get_available_balance(v_uid);
  IF v_available < p_token_amount THEN
    RAISE EXCEPTION 'Solo % token sono attualmente disponibili per il prelievo (periodo di maturazione 7 giorni).', v_available;
  END IF;

  v_euro := round(p_token_amount * v_payout_rate, 2);
  IF v_euro < v_min_eur THEN
    RAISE EXCEPTION 'Payout minimo €% (almeno % token)', v_min_eur, ceil(v_min_eur / v_payout_rate)::integer;
  END IF;

  -- Fraud check: multiple payout requests in 24h
  IF (SELECT count(*) FROM payout_requests WHERE creator_id = v_uid AND created_at > now() - interval '24 hours') >= 3 THEN
    PERFORM _log_fraud(v_uid, 'rapid_payouts', 'high',
      jsonb_build_object('token_amount', p_token_amount, 'euro', v_euro));
    RAISE EXCEPTION 'Troppe richieste di payout nelle ultime 24 ore. Massimo 3 al giorno.';
  END IF;

  INSERT INTO payout_requests (creator_id, token_amount, euro_amount, status, notes)
  VALUES (v_uid, p_token_amount, v_euro, 'pending', p_notes)
  RETURNING * INTO v_payout;

  UPDATE token_wallets
  SET balance = balance - p_token_amount, total_spent = total_spent + p_token_amount, updated_at = now()
  WHERE id = v_wallet.id;

  INSERT INTO token_transactions (user_id, wallet_type, type, amount, description)
  VALUES (v_uid, 'creator', 'payout', -p_token_amount, 'Richiesta payout €' || v_euro);

  INSERT INTO financial_logs (action, actor_id, amount_tokens, amount_eur, details)
  VALUES ('payout_request', v_uid, p_token_amount, v_euro,
    jsonb_build_object('payout_id', v_payout.id, 'notes', p_notes));

  RETURN to_jsonb(v_payout);
END;
$$;

-- =====================================================================
-- 20. PERMISSIONS (idempotent)
-- =====================================================================

-- Atomic RPCs: authenticated only
REVOKE ALL ON FUNCTION public.rpc_subscribe(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpc_subscribe(uuid, text) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.rpc_unlock_content(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpc_unlock_content(uuid) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.rpc_paid_message(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpc_paid_message(uuid) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.rpc_donate(uuid, integer, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpc_donate(uuid, integer, uuid) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.rpc_live_access(uuid, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpc_live_access(uuid, integer) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.wallet_request_payout(integer, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.wallet_request_payout(integer, text) TO authenticated, service_role;

-- Config reader: everyone can read
GRANT EXECUTE ON FUNCTION public.mconfig(text) TO authenticated, service_role, anon;

-- Internal helpers: only postgres/service_role (already revoked above)

-- Lock legacy functions from client
REVOKE ALL ON FUNCTION public.wallet_credit_creator(uuid, integer, text, text, text) FROM PUBLIC, authenticated, anon;
GRANT EXECUTE ON FUNCTION public.wallet_credit_creator(uuid, integer, text, text, text) TO service_role;

REVOKE EXECUTE ON FUNCTION public.wallet_topup(integer, text) FROM authenticated, anon;
