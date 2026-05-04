-- =============================================================================
-- Admin Panel — new tables for audit logging, system config, admin notifications
-- =============================================================================

-- 1. Audit log
CREATE TABLE IF NOT EXISTS audit_log (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id uuid NOT NULL,
  action text NOT NULL,
  target_type text,
  target_id text,
  details jsonb DEFAULT '{}',
  ip_address text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_admin ON audit_log(admin_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON audit_log(action);
CREATE INDEX IF NOT EXISTS idx_audit_log_created ON audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_target ON audit_log(target_type, target_id);

ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS audit_log_admin_only ON audit_log;
CREATE POLICY audit_log_admin_only ON audit_log FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Service role inserts (from backend)
DROP POLICY IF EXISTS audit_log_service_insert ON audit_log;
CREATE POLICY audit_log_service_insert ON audit_log FOR INSERT
  WITH CHECK (true);

-- 2. System config (key-value)
CREATE TABLE IF NOT EXISTS system_config (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  updated_by uuid,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE system_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS system_config_admin ON system_config;
CREATE POLICY system_config_admin ON system_config FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Default config values
INSERT INTO system_config (key, value) VALUES
  ('platform_fee_percent', '"15"'),
  ('token_buy_rate_eur', '"0.118"'),
  ('token_sell_rate_eur', '"0.10"'),
  ('max_donation_tokens', '"10000"'),
  ('max_live_price_tokens', '"5000"'),
  ('min_payout_tokens', '"100"'),
  ('features', '{"live_streaming": true, "donations": true, "subscriptions": true, "messaging": true}')
ON CONFLICT (key) DO NOTHING;

-- 3. Admin notifications
CREATE TABLE IF NOT EXISTS admin_notifications (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id uuid NOT NULL,
  target_id uuid,
  title text NOT NULL,
  body text,
  type text DEFAULT 'info' CHECK (type IN ('info', 'warning', 'promo', 'system')),
  is_global boolean DEFAULT false,
  read_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_notif_target ON admin_notifications(target_id);
CREATE INDEX IF NOT EXISTS idx_admin_notif_global ON admin_notifications(is_global) WHERE is_global = true;
CREATE INDEX IF NOT EXISTS idx_admin_notif_created ON admin_notifications(created_at DESC);

ALTER TABLE admin_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS admin_notif_admin_all ON admin_notifications;
CREATE POLICY admin_notif_admin_all ON admin_notifications FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS admin_notif_own_read ON admin_notifications;
CREATE POLICY admin_notif_own_read ON admin_notifications FOR SELECT
  USING (target_id = auth.uid() OR is_global = true);
