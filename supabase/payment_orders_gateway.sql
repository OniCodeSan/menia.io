-- =====================================================================
-- Payment Orders Gateway Extensions
-- Adds service-role callable confirmation functions for webhook use.
-- The existing admin-callable RPCs remain for manual admin flows.
-- Safe to run multiple times (idempotent).
-- =====================================================================

-- 1. Service-role confirm token purchase (no auth.uid check)
-- Called from the API server using service_role key.
CREATE OR REPLACE FUNCTION public.srv_confirm_token_purchase(p_order_id uuid, p_provider_ref text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order record;
  v_wallet record;
BEGIN
  SELECT * INTO v_order FROM payment_orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Ordine non trovato'; END IF;
  IF v_order.order_type != 'token_pack' THEN RAISE EXCEPTION 'Ordine non è un token pack'; END IF;
  IF v_order.status = 'succeeded' THEN
    RETURN jsonb_build_object('already_confirmed', true, 'order_id', v_order.id);
  END IF;
  IF v_order.status != 'pending' THEN RAISE EXCEPTION 'Ordine non è in stato pending (stato: %)', v_order.status; END IF;

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

  INSERT INTO token_transactions (user_id, wallet_type, type, amount, description, ref_id, ref_type)
  VALUES (v_order.user_id, 'user', 'topup', v_order.token_amount,
          'Acquisto ' || v_order.token_amount || ' Token (€' || v_order.amount_eur || ')',
          v_order.id::text, 'token_purchase');

  UPDATE payment_orders
  SET status = 'succeeded', confirmed_at = now(), updated_at = now(),
      provider_reference = COALESCE(p_provider_ref, provider_reference)
  WHERE id = p_order_id;

  RETURN jsonb_build_object('confirmed', true, 'order_id', v_order.id, 'tokens', v_order.token_amount);
END;
$$;

-- 2. Service-role confirm plan purchase
CREATE OR REPLACE FUNCTION public.srv_confirm_plan_purchase(p_order_id uuid, p_provider_ref text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order record;
  v_current_plan text;
BEGIN
  SELECT * INTO v_order FROM payment_orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Ordine non trovato'; END IF;
  IF v_order.order_type != 'creator_plan' THEN RAISE EXCEPTION 'Ordine non è un piano creator'; END IF;
  IF v_order.status = 'succeeded' THEN
    RETURN jsonb_build_object('already_confirmed', true, 'order_id', v_order.id);
  END IF;
  IF v_order.status != 'pending' THEN RAISE EXCEPTION 'Ordine non è in stato pending (stato: %)', v_order.status; END IF;

  SELECT plan INTO v_current_plan FROM profiles WHERE id = v_order.user_id;

  UPDATE profiles
  SET plan = v_order.target_code, updated_at = now()
  WHERE id = v_order.user_id;

  UPDATE payment_orders
  SET status = 'succeeded', confirmed_at = now(), updated_at = now(),
      provider_reference = COALESCE(p_provider_ref, provider_reference),
      metadata_json = COALESCE(metadata_json, '{}'::jsonb) || jsonb_build_object('previous_plan', v_current_plan)
  WHERE id = p_order_id;

  RETURN jsonb_build_object('confirmed', true, 'order_id', v_order.id, 'plan', v_order.target_code, 'previous_plan', v_current_plan);
END;
$$;

-- 3. Service-role fail order
CREATE OR REPLACE FUNCTION public.srv_fail_payment_order(p_order_id uuid, p_provider_ref text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order record;
BEGIN
  SELECT * INTO v_order FROM payment_orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Ordine non trovato'; END IF;
  IF v_order.status = 'failed' THEN
    RETURN jsonb_build_object('already_failed', true, 'order_id', v_order.id);
  END IF;
  IF v_order.status != 'pending' THEN RAISE EXCEPTION 'Ordine non è in stato pending (stato: %)', v_order.status; END IF;

  UPDATE payment_orders
  SET status = 'failed', updated_at = now(),
      provider_reference = COALESCE(p_provider_ref, provider_reference)
  WHERE id = p_order_id;

  RETURN jsonb_build_object('failed', true, 'order_id', v_order.id);
END;
$$;
