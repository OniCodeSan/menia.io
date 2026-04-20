-- Increment live session donation total
CREATE OR REPLACE FUNCTION increment_live_donations(p_live_id uuid, p_amount integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE live_sessions
  SET total_donations = total_donations + p_amount
  WHERE id = p_live_id;
END;
$$;

-- Credit creator wallet from live donation
CREATE OR REPLACE FUNCTION wallet_credit_creator(p_creator_id uuid, p_amount integer, p_description text DEFAULT 'Donazione live')
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_wallet_id uuid;
BEGIN
  -- Ensure creator wallet exists
  SELECT id INTO v_wallet_id
  FROM token_wallets
  WHERE user_id = p_creator_id AND wallet_type = 'creator';

  IF v_wallet_id IS NULL THEN
    INSERT INTO token_wallets (user_id, wallet_type, balance, total_earned, total_spent)
    VALUES (p_creator_id, 'creator', 0, 0, 0)
    RETURNING id INTO v_wallet_id;
  END IF;

  -- Credit wallet
  UPDATE token_wallets
  SET balance = balance + p_amount,
      total_earned = total_earned + p_amount
  WHERE id = v_wallet_id;

  -- Record transaction
  INSERT INTO token_transactions (user_id, wallet_type, type, amount, description)
  VALUES (p_creator_id, 'creator', 'earning', p_amount, p_description);
END;
$$;
