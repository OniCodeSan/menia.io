-- =====================================================================
-- Atomic Monetization RPCs
-- Replaces client-side spend+credit+record pattern with single atomic
-- transactions. Closes the wallet_credit_creator exploit.
-- Safe to run multiple times (CREATE OR REPLACE + idempotent grants).
-- =====================================================================

-- =====================================================================
-- 1. rpc_subscribe(p_creator_id, p_tier)
-- Atomically: validate plan → debit fan → credit creator → upsert sub
-- =====================================================================
CREATE OR REPLACE FUNCTION public.rpc_subscribe(
  p_creator_id uuid,
  p_tier text DEFAULT 'base'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid;
  v_plan text;
  v_cost integer;
  v_fan_wallet record;
  v_creator_wallet_id uuid;
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

  -- Credit creator
  SELECT id INTO v_creator_wallet_id FROM token_wallets
    WHERE user_id = p_creator_id AND wallet_type = 'creator';
  IF v_creator_wallet_id IS NULL THEN
    INSERT INTO token_wallets (user_id, wallet_type, balance, total_earned, total_spent)
    VALUES (p_creator_id, 'creator', 0, 0, 0)
    RETURNING id INTO v_creator_wallet_id;
  END IF;

  UPDATE token_wallets
  SET balance = balance + v_cost, total_earned = total_earned + v_cost, updated_at = now()
  WHERE id = v_creator_wallet_id;

  INSERT INTO token_transactions (user_id, wallet_type, type, amount, description, ref_id, ref_type)
  VALUES (p_creator_id, 'creator', 'earn', v_cost, 'Abbonamento ' || p_tier || ' da fan', v_uid::text, 'subscription');

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

  RETURN jsonb_build_object(
    'tier', p_tier, 'cost', v_cost,
    'expires_at', v_expires,
    'subscription_id', v_sub_id
  );
END;
$$;

-- =====================================================================
-- 2. rpc_unlock_content(p_post_id)
-- Atomically: validate post/plan → check idempotent → debit → credit → record
-- =====================================================================
CREATE OR REPLACE FUNCTION public.rpc_unlock_content(
  p_post_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid;
  v_post record;
  v_plan text;
  v_price integer;
  v_fan_wallet record;
  v_creator_wallet_id uuid;
  v_existing_unlock uuid;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Non autenticato'; END IF;

  SELECT id, creator_id, price, access INTO v_post
  FROM posts WHERE id = p_post_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Contenuto non trovato'; END IF;
  IF v_post.creator_id = v_uid THEN
    RETURN jsonb_build_object('already_unlocked', true);
  END IF;
  IF v_post.price IS NULL OR v_post.price <= 0 THEN RAISE EXCEPTION 'Contenuto senza prezzo'; END IF;

  SELECT plan INTO v_plan FROM profiles WHERE id = v_post.creator_id;
  IF v_plan NOT IN ('start', 'pro') THEN
    RAISE EXCEPTION 'Questo creator non può ricevere token con il piano attuale';
  END IF;

  -- Idempotent: already unlocked?
  SELECT id INTO v_existing_unlock FROM content_unlocks
    WHERE fan_id = v_uid AND post_id = p_post_id;
  IF FOUND THEN
    RETURN jsonb_build_object('already_unlocked', true);
  END IF;

  v_price := round(v_post.price)::integer;

  -- Debit fan
  SELECT * INTO v_fan_wallet FROM token_wallets
    WHERE user_id = v_uid AND wallet_type = 'user' FOR UPDATE;
  IF NOT FOUND OR v_fan_wallet.balance < v_price THEN
    RAISE EXCEPTION 'Saldo insufficiente';
  END IF;

  UPDATE token_wallets
  SET balance = balance - v_price, total_spent = total_spent + v_price, updated_at = now()
  WHERE id = v_fan_wallet.id;

  INSERT INTO token_transactions (user_id, wallet_type, type, amount, description, ref_id, ref_type)
  VALUES (v_uid, 'user', 'spend', -v_price, 'Sblocco contenuto', p_post_id::text, 'unlock');

  -- Credit creator
  SELECT id INTO v_creator_wallet_id FROM token_wallets
    WHERE user_id = v_post.creator_id AND wallet_type = 'creator';
  IF v_creator_wallet_id IS NULL THEN
    INSERT INTO token_wallets (user_id, wallet_type, balance, total_earned, total_spent)
    VALUES (v_post.creator_id, 'creator', 0, 0, 0)
    RETURNING id INTO v_creator_wallet_id;
  END IF;

  UPDATE token_wallets
  SET balance = balance + v_price, total_earned = total_earned + v_price, updated_at = now()
  WHERE id = v_creator_wallet_id;

  INSERT INTO token_transactions (user_id, wallet_type, type, amount, description, ref_id, ref_type)
  VALUES (v_post.creator_id, 'creator', 'earn', v_price, 'Sblocco contenuto da fan', p_post_id::text, 'unlock');

  -- Record unlock
  INSERT INTO content_unlocks (fan_id, post_id, tokens_paid)
  VALUES (v_uid, p_post_id, v_price);

  RETURN jsonb_build_object('already_unlocked', false, 'tokens_paid', v_price);
END;
$$;

-- =====================================================================
-- 3. rpc_paid_message(p_creator_id)
-- Atomically: validate plan → debit fan → credit creator
-- Returns cost=0 if creator plan doesn't require paid DMs.
-- =====================================================================
CREATE OR REPLACE FUNCTION public.rpc_paid_message(
  p_creator_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid;
  v_plan text;
  v_cost integer := 1;
  v_fan_wallet record;
  v_creator_wallet_id uuid;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Non autenticato'; END IF;

  SELECT plan INTO v_plan FROM profiles WHERE id = p_creator_id;
  IF v_plan IS NULL THEN RAISE EXCEPTION 'Creator non trovato'; END IF;

  IF v_plan NOT IN ('start', 'pro') THEN
    RETURN jsonb_build_object('cost', 0);
  END IF;

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
  VALUES (v_uid, 'user', 'spend', -v_cost, 'Messaggio a creator', p_creator_id::text, 'dm');

  -- Credit creator
  SELECT id INTO v_creator_wallet_id FROM token_wallets
    WHERE user_id = p_creator_id AND wallet_type = 'creator';
  IF v_creator_wallet_id IS NULL THEN
    INSERT INTO token_wallets (user_id, wallet_type, balance, total_earned, total_spent)
    VALUES (p_creator_id, 'creator', 0, 0, 0)
    RETURNING id INTO v_creator_wallet_id;
  END IF;

  UPDATE token_wallets
  SET balance = balance + v_cost, total_earned = total_earned + v_cost, updated_at = now()
  WHERE id = v_creator_wallet_id;

  INSERT INTO token_transactions (user_id, wallet_type, type, amount, description, ref_id, ref_type)
  VALUES (p_creator_id, 'creator', 'earn', v_cost, 'Messaggio da fan', v_uid::text, 'dm');

  RETURN jsonb_build_object('cost', v_cost);
END;
$$;

-- =====================================================================
-- 4. rpc_donate(p_creator_id, p_amount, p_live_id)
-- Atomically: validate plan → debit fan → credit creator → bump live totals
-- =====================================================================
CREATE OR REPLACE FUNCTION public.rpc_donate(
  p_creator_id uuid,
  p_amount integer,
  p_live_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid;
  v_plan text;
  v_fan_wallet record;
  v_creator_wallet_id uuid;
  v_ref_id text;
  v_desc text;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Non autenticato'; END IF;
  IF p_amount <= 0 OR p_amount > 100000 THEN RAISE EXCEPTION 'Importo non valido'; END IF;

  SELECT plan INTO v_plan FROM profiles WHERE id = p_creator_id;
  IF v_plan IS NULL THEN RAISE EXCEPTION 'Creator non trovato'; END IF;
  IF v_plan NOT IN ('start', 'pro') THEN
    RAISE EXCEPTION 'Questo creator non può ricevere donazioni con il piano attuale';
  END IF;

  v_ref_id := COALESCE(p_live_id::text, p_creator_id::text);
  v_desc := CASE WHEN p_live_id IS NOT NULL THEN 'Donazione live' ELSE 'Donazione a creator' END;

  -- Debit fan
  SELECT * INTO v_fan_wallet FROM token_wallets
    WHERE user_id = v_uid AND wallet_type = 'user' FOR UPDATE;
  IF NOT FOUND OR v_fan_wallet.balance < p_amount THEN
    RAISE EXCEPTION 'Saldo insufficiente';
  END IF;

  UPDATE token_wallets
  SET balance = balance - p_amount, total_spent = total_spent + p_amount, updated_at = now()
  WHERE id = v_fan_wallet.id;

  INSERT INTO token_transactions (user_id, wallet_type, type, amount, description, ref_id, ref_type)
  VALUES (v_uid, 'user', 'spend', -p_amount, v_desc, v_ref_id, 'donation');

  -- Credit creator
  SELECT id INTO v_creator_wallet_id FROM token_wallets
    WHERE user_id = p_creator_id AND wallet_type = 'creator';
  IF v_creator_wallet_id IS NULL THEN
    INSERT INTO token_wallets (user_id, wallet_type, balance, total_earned, total_spent)
    VALUES (p_creator_id, 'creator', 0, 0, 0)
    RETURNING id INTO v_creator_wallet_id;
  END IF;

  UPDATE token_wallets
  SET balance = balance + p_amount, total_earned = total_earned + p_amount, updated_at = now()
  WHERE id = v_creator_wallet_id;

  INSERT INTO token_transactions (user_id, wallet_type, type, amount, description, ref_id, ref_type)
  VALUES (p_creator_id, 'creator', 'earn', p_amount, v_desc, v_ref_id, 'donation');

  -- Increment live donation totals if applicable
  IF p_live_id IS NOT NULL THEN
    UPDATE live_sessions
    SET total_donations = COALESCE(total_donations, 0) + p_amount
    WHERE id = p_live_id;
  END IF;

  RETURN jsonb_build_object('amount', p_amount);
END;
$$;

-- =====================================================================
-- 5. rpc_live_access(p_live_id, p_amount)
-- Atomically: validate live/plan → idempotent check → debit → credit
-- =====================================================================
CREATE OR REPLACE FUNCTION public.rpc_live_access(
  p_live_id uuid,
  p_amount integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid;
  v_session record;
  v_plan text;
  v_fan_wallet record;
  v_creator_wallet_id uuid;
  v_existing bigint;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Non autenticato'; END IF;
  IF p_amount <= 0 THEN RAISE EXCEPTION 'Importo non valido'; END IF;

  SELECT id, creator_id INTO v_session FROM live_sessions WHERE id = p_live_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Live non trovata'; END IF;

  SELECT plan INTO v_plan FROM profiles WHERE id = v_session.creator_id;
  IF v_plan != 'pro' THEN
    RAISE EXCEPTION 'Questa live non è disponibile';
  END IF;

  -- Idempotent: already has access?
  SELECT count(*) INTO v_existing FROM token_transactions
    WHERE user_id = v_uid AND type = 'spend' AND ref_id = 'live:' || p_live_id::text;
  IF v_existing > 0 THEN
    RETURN jsonb_build_object('already_owned', true);
  END IF;

  -- Debit fan
  SELECT * INTO v_fan_wallet FROM token_wallets
    WHERE user_id = v_uid AND wallet_type = 'user' FOR UPDATE;
  IF NOT FOUND OR v_fan_wallet.balance < p_amount THEN
    RAISE EXCEPTION 'Saldo insufficiente';
  END IF;

  UPDATE token_wallets
  SET balance = balance - p_amount, total_spent = total_spent + p_amount, updated_at = now()
  WHERE id = v_fan_wallet.id;

  INSERT INTO token_transactions (user_id, wallet_type, type, amount, description, ref_id, ref_type)
  VALUES (v_uid, 'user', 'spend', -p_amount, 'Accesso live', 'live:' || p_live_id::text, 'live_access');

  -- Credit creator
  SELECT id INTO v_creator_wallet_id FROM token_wallets
    WHERE user_id = v_session.creator_id AND wallet_type = 'creator';
  IF v_creator_wallet_id IS NULL THEN
    INSERT INTO token_wallets (user_id, wallet_type, balance, total_earned, total_spent)
    VALUES (v_session.creator_id, 'creator', 0, 0, 0)
    RETURNING id INTO v_creator_wallet_id;
  END IF;

  UPDATE token_wallets
  SET balance = balance + p_amount, total_earned = total_earned + p_amount, updated_at = now()
  WHERE id = v_creator_wallet_id;

  INSERT INTO token_transactions (user_id, wallet_type, type, amount, description, ref_id, ref_type)
  VALUES (v_session.creator_id, 'creator', 'earn', p_amount, 'Accesso live da fan', 'live:' || p_live_id::text, 'live_access');

  RETURN jsonb_build_object('already_owned', false);
END;
$$;

-- =====================================================================
-- PERMISSIONS
-- =====================================================================

-- New atomic RPCs: authenticated only (they use auth.uid() internally)
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

-- Lock wallet_credit_creator from all client roles
REVOKE ALL ON FUNCTION public.wallet_credit_creator(uuid, integer, text, text, text) FROM PUBLIC, authenticated, anon;
GRANT EXECUTE ON FUNCTION public.wallet_credit_creator(uuid, integer, text, text, text) TO service_role;
