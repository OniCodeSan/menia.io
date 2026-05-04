-- =============================================================================
-- GDPR Hardening — age verification, DOB protection, retention, login log
-- =============================================================================

-- 1. Add age_verified_at column
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS age_verified_at timestamptz;

-- 2. Prevent date_of_birth changes after first set
CREATE OR REPLACE FUNCTION prevent_dob_update()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.date_of_birth IS NOT NULL AND NEW.date_of_birth IS DISTINCT FROM OLD.date_of_birth THEN
    RAISE EXCEPTION 'date_of_birth cannot be changed once set';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_dob_update ON profiles;
CREATE TRIGGER trg_prevent_dob_update
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  WHEN (OLD.date_of_birth IS NOT NULL AND OLD.date_of_birth IS DISTINCT FROM NEW.date_of_birth)
  EXECUTE FUNCTION prevent_dob_update();

-- 3. Update handle_new_user to pass date_of_birth from metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

  INSERT INTO public.token_wallets (user_id, wallet_type, balance, total_earned, total_spent)
  VALUES (new.id, 'user', 0, 0, 0)
  ON CONFLICT (user_id, wallet_type) DO NOTHING;

  RETURN new;
END;
$$;

-- 4. Function to auto-clean old data (retention policy)
CREATE OR REPLACE FUNCTION gdpr_data_retention_cleanup()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
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
