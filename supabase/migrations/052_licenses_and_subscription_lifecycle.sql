-- ============================================================
-- Migration 052: Licenses & Subscription Lifecycle Automation
--
-- Supports Phase 4:
-- 1. platform_licenses: Cryptographic hashed licenses, entitlements, and audit trail
-- 2. reminder_delivery_logs: Delivery tracking with daily deduplication
-- 3. platform_billing_settings: Configurable 15-day reminder schedules & grace periods
-- ============================================================

-- ------------------------------------------------------------
-- 1. Platform Licenses Table
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS platform_licenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  license_key_hash TEXT UNIQUE NOT NULL,
  license_key_prefix TEXT NOT NULL,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  plan_id TEXT NOT NULL,
  plan_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN (
    'ACTIVE', 'GRACE_PERIOD', 'SUSPENDED', 'EXPIRED', 'REVOKED'
  )),
  valid_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  valid_until TIMESTAMPTZ NOT NULL,
  grace_period_days INTEGER NOT NULL DEFAULT 3,
  entitlements JSONB NOT NULL DEFAULT '{}'::jsonb,
  audit_events JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_licenses_account ON platform_licenses (account_id);
CREATE INDEX IF NOT EXISTS idx_licenses_valid_until ON platform_licenses (valid_until);
CREATE INDEX IF NOT EXISTS idx_licenses_status ON platform_licenses (status);

ALTER TABLE platform_licenses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Super admins can manage licenses" ON platform_licenses;
CREATE POLICY "Super admins can manage licenses"
  ON platform_licenses
  FOR ALL
  USING (
    public.is_super_admin()
  )
  WITH CHECK (
    public.is_super_admin()
  );

DROP POLICY IF EXISTS "Account members can view own license" ON platform_licenses;
CREATE POLICY "Account members can view own license"
  ON platform_licenses
  FOR SELECT
  USING (
    account_id IN (
      SELECT account_id FROM profiles WHERE user_id = auth.uid()
    )
  );

-- ------------------------------------------------------------
-- 2. Reminder Delivery Logs (Prevents Duplicate Sends)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS reminder_delivery_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  milestone_days INTEGER NOT NULL,
  channel TEXT NOT NULL DEFAULT 'whatsapp' CHECK (channel IN ('whatsapp', 'email')),
  recipient TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'delivered' CHECK (status IN ('sent', 'delivered', 'failed', 'skipped')),
  provider_ref TEXT,
  sent_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_reminder_account_milestone_date UNIQUE (account_id, milestone_days, sent_date)
);

CREATE INDEX IF NOT EXISTS idx_reminder_logs_account ON reminder_delivery_logs (account_id, sent_date DESC);

ALTER TABLE reminder_delivery_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Super admins can view reminder logs" ON reminder_delivery_logs;
CREATE POLICY "Super admins can view reminder logs"
  ON reminder_delivery_logs
  FOR ALL
  USING (
    public.is_super_admin()
  )
  WITH CHECK (
    public.is_super_admin()
  );

DROP POLICY IF EXISTS "Account members can view own reminder logs" ON reminder_delivery_logs;
CREATE POLICY "Account members can view own reminder logs"
  ON reminder_delivery_logs
  FOR SELECT
  USING (
    account_id IN (
      SELECT account_id FROM profiles WHERE user_id = auth.uid()
    )
  );

-- ------------------------------------------------------------
-- 3. Extend platform_billing_settings with 15-day reminders & grace period
-- ------------------------------------------------------------
ALTER TABLE platform_billing_settings
  ADD COLUMN IF NOT EXISTS default_reminder_days INTEGER[] DEFAULT '{15, 7, 3, 1, 0}',
  ADD COLUMN IF NOT EXISTS default_grace_period_days INTEGER DEFAULT 3;
