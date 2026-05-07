-- =====================================================================
-- Tokaro.fans — Beta Pre-Launch Schema
-- Adds: creator welcome bonus, fan invite codes, conversation unlocks,
-- behavior log. Modifies rpc_paid_message for 5-token first-message model.
-- Safe to run multiple times (idempotent).
-- =====================================================================

-- =====================================================================
-- 1. CREATOR WELCOME BONUS — premium_until column
-- =====================================================================
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'premium_until'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN premium_until timestamptz;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS profiles_premium_until_idx
  ON public.profiles(premium_until)
  WHERE premium_until IS NOT NULL;

-- =====================================================================
-- 2. WELCOME BONUS LOG — one-shot per email anti-farming
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.welcome_bonus_log (
  email text PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  granted_at timestamptz NOT NULL DEFAULT now(),
  bonus_type text NOT NULL DEFAULT 'creator_premium_30d'
);

ALTER TABLE public.welcome_bonus_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "welcome_bonus_log_admin_select" ON public.welcome_bonus_log;
CREATE POLICY "welcome_bonus_log_admin_select" ON public.welcome_bonus_log
  FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- =====================================================================
-- 3. INVITE CODES — fans receive 50 tokens via single-use code
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.invite_codes (
  code text PRIMARY KEY,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'redeemed', 'revoked')),
  tokens_amount integer NOT NULL DEFAULT 50,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  redeemed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  redeemed_at timestamptz,
  notes text
);

CREATE INDEX IF NOT EXISTS invite_codes_status_idx ON public.invite_codes(status);
CREATE INDEX IF NOT EXISTS invite_codes_redeemed_by_idx ON public.invite_codes(redeemed_by) WHERE redeemed_by IS NOT NULL;

ALTER TABLE public.invite_codes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "invite_codes_admin_all" ON public.invite_codes;
CREATE POLICY "invite_codes_admin_all" ON public.invite_codes
  FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "invite_codes_redeemer_read_own" ON public.invite_codes;
CREATE POLICY "invite_codes_redeemer_read_own" ON public.invite_codes
  FOR SELECT USING (auth.uid() = redeemed_by);

-- =====================================================================
-- 4. CONVERSATION UNLOCKS — fan pays 5 tokens once per creator
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.conversation_unlocks (
  fan_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  creator_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tokens_paid integer NOT NULL,
  unlocked_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (fan_id, creator_id)
);

CREATE INDEX IF NOT EXISTS conversation_unlocks_creator_idx
  ON public.conversation_unlocks(creator_id);

ALTER TABLE public.conversation_unlocks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "conversation_unlocks_select_participant" ON public.conversation_unlocks;
CREATE POLICY "conversation_unlocks_select_participant" ON public.conversation_unlocks
  FOR SELECT USING (auth.uid() = fan_id OR auth.uid() = creator_id);

-- No INSERT policy — only the rpc_paid_message function (SECURITY DEFINER) writes here.

-- =====================================================================
-- 5. USER BEHAVIOR LOG — beta validation tracking
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.user_behavior_log (
  id bigserial PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  event_type text NOT NULL,
  ref_id text,
  ref_type text,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS user_behavior_log_user_idx ON public.user_behavior_log(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS user_behavior_log_event_idx ON public.user_behavior_log(event_type, created_at DESC);

ALTER TABLE public.user_behavior_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_behavior_log_admin_select" ON public.user_behavior_log;
CREATE POLICY "user_behavior_log_admin_select" ON public.user_behavior_log
  FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Helper used by RPCs (SECURITY DEFINER). Best-effort, never raises.
CREATE OR REPLACE FUNCTION public._log_behavior(
  p_user_id uuid,
  p_event_type text,
  p_ref_id text DEFAULT NULL,
  p_ref_type text DEFAULT NULL,
  p_metadata jsonb DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO user_behavior_log (user_id, event_type, ref_id, ref_type, metadata)
  VALUES (p_user_id, p_event_type, p_ref_id, p_ref_type, p_metadata);
EXCEPTION WHEN OTHERS THEN
  -- Never fail the parent transaction because of a logging error
  NULL;
END;
$$;

-- =====================================================================
-- 6. CREATOR WELCOME TRIGGER — set plan='pro' + premium_until on signup
-- One-shot per email. Runs on profile insert when role='creator'.
-- =====================================================================
CREATE OR REPLACE FUNCTION public._grant_creator_welcome()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_email text;
  v_already_granted boolean;
BEGIN
  IF NEW.role IS DISTINCT FROM 'creator' THEN
    RETURN NEW;
  END IF;

  SELECT email INTO v_email FROM auth.users WHERE id = NEW.id;
  IF v_email IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT EXISTS(SELECT 1 FROM welcome_bonus_log WHERE email = v_email)
    INTO v_already_granted;
  IF v_already_granted THEN
    RETURN NEW;
  END IF;

  NEW.plan := 'pro';
  NEW.premium_until := now() + interval '30 days';

  INSERT INTO welcome_bonus_log (email, user_id, bonus_type)
  VALUES (v_email, NEW.id, 'creator_premium_30d')
  ON CONFLICT (email) DO NOTHING;

  PERFORM _log_behavior(NEW.id, 'creator_welcome_granted', v_email, 'email',
    jsonb_build_object('premium_until', NEW.premium_until));

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_grant_creator_welcome ON public.profiles;
CREATE TRIGGER profiles_grant_creator_welcome
  BEFORE INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public._grant_creator_welcome();

-- Also handle the case where a profile is created as 'fan' first and later
-- updated to 'creator' (some signup flows do this).
CREATE OR REPLACE FUNCTION public._grant_creator_welcome_on_role_change()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_email text;
  v_already_granted boolean;
BEGIN
  IF NEW.role IS DISTINCT FROM 'creator' OR OLD.role = 'creator' THEN
    RETURN NEW;
  END IF;

  SELECT email INTO v_email FROM auth.users WHERE id = NEW.id;
  IF v_email IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT EXISTS(SELECT 1 FROM welcome_bonus_log WHERE email = v_email)
    INTO v_already_granted;
  IF v_already_granted THEN
    RETURN NEW;
  END IF;

  NEW.plan := 'pro';
  NEW.premium_until := now() + interval '30 days';

  INSERT INTO welcome_bonus_log (email, user_id, bonus_type)
  VALUES (v_email, NEW.id, 'creator_premium_30d')
  ON CONFLICT (email) DO NOTHING;

  PERFORM _log_behavior(NEW.id, 'creator_welcome_granted', v_email, 'email',
    jsonb_build_object('premium_until', NEW.premium_until, 'via', 'role_change'));

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_grant_creator_welcome_on_role_change ON public.profiles;
CREATE TRIGGER profiles_grant_creator_welcome_on_role_change
  BEFORE UPDATE OF role ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public._grant_creator_welcome_on_role_change();

-- =====================================================================
-- 7. DAILY REVERT — reset expired premium creators to free
-- Called by server cron. Returns count of reverted profiles.
-- =====================================================================
CREATE OR REPLACE FUNCTION public.cron_revert_expired_premium()
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_count integer;
BEGIN
  WITH reverted AS (
    UPDATE profiles
    SET plan = 'free'
    WHERE premium_until IS NOT NULL
      AND premium_until < now()
      AND plan != 'free'
    RETURNING id
  )
  SELECT count(*) INTO v_count FROM reverted;

  IF v_count > 0 THEN
    PERFORM _log_behavior(NULL, 'cron_revert_expired_premium', NULL, NULL,
      jsonb_build_object('reverted_count', v_count));
  END IF;

  RETURN v_count;
END;
$$;

-- =====================================================================
-- 8. INVITE CODE REDEMPTION — fan claims 50 tokens via single-use code
-- =====================================================================
CREATE OR REPLACE FUNCTION public.rpc_redeem_invite_code(p_code text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid uuid;
  v_invite record;
  v_already_redeemed_count integer;
  v_wallet_id uuid;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Non autenticato'; END IF;

  IF p_code IS NULL OR length(trim(p_code)) = 0 THEN
    RAISE EXCEPTION 'Codice mancante';
  END IF;

  -- One redemption per user, lifetime (anti-farming)
  SELECT count(*) INTO v_already_redeemed_count
  FROM invite_codes WHERE redeemed_by = v_uid;
  IF v_already_redeemed_count > 0 THEN
    RAISE EXCEPTION 'Hai già riscattato un codice invito';
  END IF;

  -- Lock the code row
  SELECT * INTO v_invite FROM invite_codes
    WHERE code = upper(trim(p_code))
    FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Codice non valido'; END IF;
  IF v_invite.status != 'active' THEN
    RAISE EXCEPTION 'Codice già usato o revocato';
  END IF;

  -- Mark redeemed
  UPDATE invite_codes
    SET status = 'redeemed', redeemed_by = v_uid, redeemed_at = now()
    WHERE code = v_invite.code;

  -- Ensure user wallet exists
  SELECT id INTO v_wallet_id FROM token_wallets
    WHERE user_id = v_uid AND wallet_type = 'user';
  IF v_wallet_id IS NULL THEN
    INSERT INTO token_wallets (user_id, wallet_type, balance, total_earned, total_spent)
      VALUES (v_uid, 'user', 0, 0, 0)
      RETURNING id INTO v_wallet_id;
  END IF;

  -- Credit tokens
  UPDATE token_wallets
    SET balance = balance + v_invite.tokens_amount,
        total_earned = total_earned + v_invite.tokens_amount,
        updated_at = now()
    WHERE id = v_wallet_id;

  INSERT INTO token_transactions (user_id, wallet_type, type, amount, description, ref_id, ref_type)
  VALUES (v_uid, 'user', 'topup', v_invite.tokens_amount,
    'Free Token Message', v_invite.code, 'invite_code');

  PERFORM _log_behavior(v_uid, 'invite_code_redeemed', v_invite.code, 'invite_code',
    jsonb_build_object('tokens', v_invite.tokens_amount));

  RETURN jsonb_build_object(
    'tokens_credited', v_invite.tokens_amount,
    'code', v_invite.code
  );
END;
$$;

-- =====================================================================
-- 9. ADMIN HELPER — bulk generate invite codes
-- =====================================================================
CREATE OR REPLACE FUNCTION public.admin_generate_invite_codes(
  p_count integer,
  p_tokens_amount integer DEFAULT 50,
  p_notes text DEFAULT NULL
)
RETURNS SETOF invite_codes
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid uuid;
  v_role text;
  v_code text;
  i integer;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Non autenticato'; END IF;
  SELECT role INTO v_role FROM profiles WHERE id = v_uid;
  IF v_role != 'admin' THEN RAISE EXCEPTION 'Admin richiesto'; END IF;

  IF p_count IS NULL OR p_count <= 0 OR p_count > 500 THEN
    RAISE EXCEPTION 'Quantità non valida (1-500)';
  END IF;
  IF p_tokens_amount IS NULL OR p_tokens_amount <= 0 OR p_tokens_amount > 10000 THEN
    RAISE EXCEPTION 'Tokens non validi (1-10000)';
  END IF;

  FOR i IN 1..p_count LOOP
    -- 8-char alphanumeric, A-Z + 2-9 (skip 0,1,O,I to avoid confusion)
    v_code := upper(substring(
      translate(encode(gen_random_bytes(8), 'base64'), '+/=01OIli', 'ABCDEFGHJ')
      from 1 for 8
    ));
    BEGIN
      INSERT INTO invite_codes (code, tokens_amount, created_by, notes)
      VALUES (v_code, p_tokens_amount, v_uid, p_notes);
    EXCEPTION WHEN unique_violation THEN
      -- collision, retry this iteration
      i := i - 1;
      CONTINUE;
    END;
  END LOOP;

  RETURN QUERY
    SELECT * FROM invite_codes
    WHERE created_by = v_uid
    ORDER BY created_at DESC
    LIMIT p_count;
END;
$$;

-- =====================================================================
-- 10. MODIFY rpc_paid_message — 5 tokens first message, free thereafter
-- Replaces the per-message 1-token model with a per-conversation unlock.
-- =====================================================================
CREATE OR REPLACE FUNCTION public.rpc_paid_message(
  p_creator_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid uuid;
  v_plan text;
  v_premium_until timestamptz;
  v_unlock_cost integer := 5;
  v_fan_wallet record;
  v_creator_wallet_id uuid;
  v_already_unlocked boolean;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Non autenticato'; END IF;
  IF v_uid = p_creator_id THEN
    RETURN jsonb_build_object('cost', 0, 'unlocked', true, 'reason', 'self');
  END IF;

  SELECT plan, premium_until INTO v_plan, v_premium_until
    FROM profiles WHERE id = p_creator_id;
  IF v_plan IS NULL THEN RAISE EXCEPTION 'Creator non trovato'; END IF;

  -- Plan gate: only start/pro creators can receive paid messages.
  -- Beta: creators get plan='pro' for 30d via welcome trigger, so this passes.
  IF v_plan NOT IN ('start', 'pro') THEN
    RETURN jsonb_build_object('cost', 0, 'unlocked', false, 'reason', 'creator_plan_free');
  END IF;

  -- If conversation already unlocked, free message
  SELECT EXISTS(
    SELECT 1 FROM conversation_unlocks
    WHERE fan_id = v_uid AND creator_id = p_creator_id
  ) INTO v_already_unlocked;

  IF v_already_unlocked THEN
    PERFORM _log_behavior(v_uid, 'paid_message_free', p_creator_id::text, 'creator', NULL);
    RETURN jsonb_build_object('cost', 0, 'unlocked', true, 'first_message', false);
  END IF;

  -- First message: charge unlock cost, debit fan
  SELECT * INTO v_fan_wallet FROM token_wallets
    WHERE user_id = v_uid AND wallet_type = 'user' FOR UPDATE;
  IF NOT FOUND OR v_fan_wallet.balance < v_unlock_cost THEN
    RAISE EXCEPTION 'Saldo insufficiente (servono % token per iniziare la conversazione)', v_unlock_cost;
  END IF;

  UPDATE token_wallets
    SET balance = balance - v_unlock_cost,
        total_spent = total_spent + v_unlock_cost,
        updated_at = now()
    WHERE id = v_fan_wallet.id;

  INSERT INTO token_transactions (user_id, wallet_type, type, amount, description, ref_id, ref_type)
  VALUES (v_uid, 'user', 'spend', -v_unlock_cost,
    'Sblocco conversazione', p_creator_id::text, 'dm_unlock');

  -- Credit creator
  SELECT id INTO v_creator_wallet_id FROM token_wallets
    WHERE user_id = p_creator_id AND wallet_type = 'creator';
  IF v_creator_wallet_id IS NULL THEN
    INSERT INTO token_wallets (user_id, wallet_type, balance, total_earned, total_spent)
      VALUES (p_creator_id, 'creator', 0, 0, 0)
      RETURNING id INTO v_creator_wallet_id;
  END IF;

  UPDATE token_wallets
    SET balance = balance + v_unlock_cost,
        total_earned = total_earned + v_unlock_cost,
        updated_at = now()
    WHERE id = v_creator_wallet_id;

  INSERT INTO token_transactions (user_id, wallet_type, type, amount, description, ref_id, ref_type)
  VALUES (p_creator_id, 'creator', 'earn', v_unlock_cost,
    'Sblocco conversazione da fan', v_uid::text, 'dm_unlock');

  -- Record the unlock (idempotent guard via PK)
  INSERT INTO conversation_unlocks (fan_id, creator_id, tokens_paid)
  VALUES (v_uid, p_creator_id, v_unlock_cost)
  ON CONFLICT (fan_id, creator_id) DO NOTHING;

  PERFORM _log_behavior(v_uid, 'conversation_unlocked', p_creator_id::text, 'creator',
    jsonb_build_object('cost', v_unlock_cost));

  RETURN jsonb_build_object(
    'cost', v_unlock_cost,
    'unlocked', true,
    'first_message', true
  );
END;
$$;
