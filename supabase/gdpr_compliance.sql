-- =============================================================================
-- GDPR Compliance — consent logging, data retention, account deletion
-- =============================================================================

-- 1. Cookie consent log
CREATE TABLE IF NOT EXISTS consent_log (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid,
  session_id text,
  ip_address text,
  consent_type text NOT NULL DEFAULT 'cookie',
  categories jsonb NOT NULL DEFAULT '{"necessary": true}',
  action text NOT NULL CHECK (action IN ('accept', 'reject', 'update', 'revoke')),
  policy_version text DEFAULT '1.0',
  user_agent text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_consent_log_user ON consent_log(user_id);
CREATE INDEX IF NOT EXISTS idx_consent_log_created ON consent_log(created_at DESC);

ALTER TABLE consent_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS consent_log_own_insert ON consent_log;
CREATE POLICY consent_log_own_insert ON consent_log FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS consent_log_own_read ON consent_log;
CREATE POLICY consent_log_own_read ON consent_log FOR SELECT
  USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- 2. Account deletion requests
CREATE TABLE IF NOT EXISTS deletion_requests (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  reason text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'cancelled')),
  scheduled_at timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  completed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_deletion_user ON deletion_requests(user_id);
ALTER TABLE deletion_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS deletion_own ON deletion_requests;
CREATE POLICY deletion_own ON deletion_requests FOR ALL
  USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- 3. Data export requests
CREATE TABLE IF NOT EXISTS data_export_requests (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'ready', 'expired')),
  download_url text,
  expires_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE data_export_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS export_own ON data_export_requests;
CREATE POLICY export_own ON data_export_requests FOR ALL
  USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- 4. Add date_of_birth and age_verified to profiles
DO $$ BEGIN
  ALTER TABLE profiles ADD COLUMN IF NOT EXISTS date_of_birth date;
  ALTER TABLE profiles ADD COLUMN IF NOT EXISTS age_verified boolean DEFAULT false;
  ALTER TABLE profiles ADD COLUMN IF NOT EXISTS marketing_consent boolean DEFAULT false;
  ALTER TABLE profiles ADD COLUMN IF NOT EXISTS marketing_consent_at timestamptz;
  ALTER TABLE profiles ADD COLUMN IF NOT EXISTS deletion_requested_at timestamptz;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- 5. Breach log (for internal tracking)
CREATE TABLE IF NOT EXISTS breach_log (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  detected_by uuid,
  severity text NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  description text NOT NULL,
  affected_users integer DEFAULT 0,
  data_types_affected text[],
  containment_actions text,
  notification_sent boolean DEFAULT false,
  notification_sent_at timestamptz,
  dpa_notified boolean DEFAULT false,
  dpa_notified_at timestamptz,
  status text DEFAULT 'detected' CHECK (status IN ('detected', 'investigating', 'contained', 'resolved')),
  resolved_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE breach_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS breach_admin ON breach_log;
CREATE POLICY breach_admin ON breach_log FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- 6. Login audit log
CREATE TABLE IF NOT EXISTS login_log (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid,
  email text,
  success boolean NOT NULL,
  ip_address text,
  user_agent text,
  failure_reason text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_login_log_user ON login_log(user_id);
CREATE INDEX IF NOT EXISTS idx_login_log_created ON login_log(created_at DESC);

ALTER TABLE login_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS login_log_insert ON login_log;
CREATE POLICY login_log_insert ON login_log FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS login_log_admin ON login_log;
CREATE POLICY login_log_admin ON login_log FOR SELECT
  USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
