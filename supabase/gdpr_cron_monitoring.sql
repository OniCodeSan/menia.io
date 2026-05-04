-- GDPR Cron Monitoring — cron_status table + RLS
-- Deploy: psql $DATABASE_URL -f gdpr_cron_monitoring.sql

CREATE TABLE IF NOT EXISTS cron_status (
  job_name   TEXT PRIMARY KEY,
  last_run   TIMESTAMPTZ,
  status     TEXT NOT NULL DEFAULT 'unknown',
  error      TEXT,
  duration_ms INTEGER,
  details    JSONB,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE cron_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_cron_status" ON cron_status
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

GRANT SELECT ON cron_status TO authenticated;
