-- =====================================================================
-- Monetization System Migration
-- Adds: creator plans, content unlocks, paid DMs, fixes payout rate
-- Safe to run multiple times (idempotent).
-- =====================================================================

-- 1. Add plan column to profiles
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'plan'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN plan text NOT NULL DEFAULT 'free';
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_plan_check CHECK (plan IN ('free', 'start', 'pro'));
  END IF;
END $$;

-- 2. Create content_unlocks table
CREATE TABLE IF NOT EXISTS public.content_unlocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fan_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  tokens_paid integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(fan_id, post_id)
);

ALTER TABLE public.content_unlocks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "content_unlocks_select_own" ON public.content_unlocks;
CREATE POLICY "content_unlocks_select_own" ON public.content_unlocks
  FOR SELECT USING (auth.uid() = fan_id);

DROP POLICY IF EXISTS "content_unlocks_insert_own" ON public.content_unlocks;
CREATE POLICY "content_unlocks_insert_own" ON public.content_unlocks
  FOR INSERT WITH CHECK (auth.uid() = fan_id);

-- 3. Add cost column to direct_messages
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'direct_messages' AND column_name = 'cost'
  ) THEN
    ALTER TABLE public.direct_messages ADD COLUMN cost integer NOT NULL DEFAULT 0;
  END IF;
END $$;

-- 4. Add ref_type to token_transactions (ref_id already exists)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'token_transactions' AND column_name = 'ref_type'
  ) THEN
    ALTER TABLE public.token_transactions ADD COLUMN ref_type text;
  END IF;
END $$;

-- 5. Fix wallet_credit_creator: accept ref_id/ref_type, use 'earn' type, set search_path
CREATE OR REPLACE FUNCTION public.wallet_credit_creator(
  p_creator_id uuid,
  p_amount integer,
  p_description text DEFAULT 'Credito creator',
  p_ref_id text DEFAULT NULL,
  p_ref_type text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_wallet_id uuid;
BEGIN
  SELECT id INTO v_wallet_id
  FROM token_wallets
  WHERE user_id = p_creator_id AND wallet_type = 'creator';

  IF v_wallet_id IS NULL THEN
    INSERT INTO token_wallets (user_id, wallet_type, balance, total_earned, total_spent)
    VALUES (p_creator_id, 'creator', 0, 0, 0)
    RETURNING id INTO v_wallet_id;
  END IF;

  UPDATE token_wallets
  SET balance = balance + p_amount,
      total_earned = total_earned + p_amount,
      updated_at = now()
  WHERE id = v_wallet_id;

  INSERT INTO token_transactions (user_id, wallet_type, type, amount, description, ref_id, ref_type)
  VALUES (p_creator_id, 'creator', 'earn', p_amount, p_description, p_ref_id, p_ref_type);
END;
$$;

-- 6. Update wallet_spend to accept ref_type parameter
CREATE OR REPLACE FUNCTION public.wallet_spend(
  p_amount integer,
  p_description text DEFAULT 'Spesa',
  p_ref_id text DEFAULT NULL,
  p_ref_type text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid;
  v_wallet record;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Non autenticato'; END IF;
  IF p_amount <= 0 OR p_amount > 100000 THEN RAISE EXCEPTION 'Importo non valido'; END IF;

  SELECT * INTO v_wallet
  FROM token_wallets
  WHERE user_id = v_uid AND wallet_type = 'user'
  FOR UPDATE;

  IF NOT FOUND OR v_wallet.balance < p_amount THEN
    RAISE EXCEPTION 'Saldo insufficiente';
  END IF;

  UPDATE token_wallets
  SET balance = balance - p_amount,
      total_spent = total_spent + p_amount,
      updated_at = now()
  WHERE id = v_wallet.id;

  INSERT INTO token_transactions (user_id, wallet_type, type, amount, description, ref_id, ref_type)
  VALUES (v_uid, 'user', 'spend', -p_amount, p_description, p_ref_id, p_ref_type);

  RETURN jsonb_build_object('balance', v_wallet.balance - p_amount);
END;
$$;

-- 7. Fix payout rate: 1T = 0.10 EUR (was 0.08)
CREATE OR REPLACE FUNCTION public.wallet_request_payout(
  p_token_amount integer,
  p_notes text DEFAULT ''
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid;
  v_wallet record;
  v_euro numeric(10,2);
  v_payout record;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Non autenticato'; END IF;
  IF p_token_amount <= 0 THEN RAISE EXCEPTION 'Importo non valido'; END IF;

  SELECT * INTO v_wallet
  FROM token_wallets
  WHERE user_id = v_uid AND wallet_type = 'creator'
  FOR UPDATE;

  IF NOT FOUND OR v_wallet.balance < p_token_amount THEN
    RAISE EXCEPTION 'Saldo creator insufficiente';
  END IF;

  v_euro := round(p_token_amount * 0.10, 2);

  IF v_euro < 50.00 THEN
    RAISE EXCEPTION 'Payout minimo €50 (almeno 500 token)';
  END IF;

  INSERT INTO payout_requests (creator_id, token_amount, euro_amount, status, notes)
  VALUES (v_uid, p_token_amount, v_euro, 'pending', p_notes)
  RETURNING * INTO v_payout;

  UPDATE token_wallets
  SET balance = balance - p_token_amount,
      total_spent = total_spent + p_token_amount,
      updated_at = now()
  WHERE id = v_wallet.id;

  INSERT INTO token_transactions (user_id, wallet_type, type, amount, description)
  VALUES (v_uid, 'creator', 'payout', -p_token_amount, 'Richiesta payout €' || v_euro);

  RETURN to_jsonb(v_payout);
END;
$$;

-- 8. Fix any existing 'earning' type rows to 'earn'
UPDATE public.token_transactions SET type = 'earn' WHERE type = 'earning';
