-- =====================================================================
-- Payment Orders — pre-gateway payment lifecycle
-- Supports token_pack and creator_plan purchase intents.
-- Wallet credits / plan activation happen ONLY on confirmation.
-- Safe to run multiple times (idempotent).
-- =====================================================================

-- 1. Payment orders table
CREATE TABLE IF NOT EXISTS public.payment_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  order_type text NOT NULL CHECK (order_type IN ('token_pack', 'creator_plan')),
  target_code text NOT NULL,
  amount_eur numeric(10,2) NOT NULL,
  token_amount integer,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'succeeded', 'failed', 'cancelled')),
  provider text,
  provider_reference text,
  metadata_json jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  confirmed_at timestamptz
);

CREATE INDEX IF NOT EXISTS payment_orders_user_idx ON public.payment_orders(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS payment_orders_status_idx ON public.payment_orders(status, created_at DESC);

-- RLS
ALTER TABLE public.payment_orders ENABLE ROW LEVEL SECURITY;

-- Users can see their own orders
DROP POLICY IF EXISTS "payment_orders_select_own" ON public.payment_orders;
CREATE POLICY "payment_orders_select_own" ON public.payment_orders
  FOR SELECT USING (
    auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Users can create their own orders (pending only)
DROP POLICY IF EXISTS "payment_orders_insert_own" ON public.payment_orders;
CREATE POLICY "payment_orders_insert_own" ON public.payment_orders
  FOR INSERT WITH CHECK (auth.uid() = user_id AND status = 'pending');

-- Only admins can update orders (confirm/fail)
DROP POLICY IF EXISTS "payment_orders_update_admin" ON public.payment_orders;
CREATE POLICY "payment_orders_update_admin" ON public.payment_orders
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- 2. Confirm token purchase — credits wallet, marks order succeeded
-- Idempotent: if already succeeded, returns success without double-credit.
CREATE OR REPLACE FUNCTION public.confirm_token_purchase(p_order_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

-- 3. Confirm plan purchase — activates plan, marks order succeeded
CREATE OR REPLACE FUNCTION public.confirm_plan_purchase(p_order_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

-- 4. Fail a payment order
CREATE OR REPLACE FUNCTION public.fail_payment_order(p_order_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
