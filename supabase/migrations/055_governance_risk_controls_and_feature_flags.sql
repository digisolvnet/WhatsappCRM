-- ============================================================
-- Migration 055: Governance, Risk Controls, Abuse Detection & Feature Flags
--
-- Supports Phase 7:
-- 1. platform_abuse_records: Multi-tiered abuse detection, severity scoring & kill-switches.
-- 2. platform_feature_flags: Enterprise feature flags (ON/OFF/SOON/BETA/TRIAL/SCHEDULED).
-- 3. platform_data_export_requests: Tenant-scoped data export & deletion governance.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Abuse Detection & Risk Controls Table
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS platform_abuse_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  state TEXT NOT NULL DEFAULT 'NORMAL' CHECK (state IN (
    'NORMAL', 'FLAGGED', 'REVIEW_REQUIRED', 'RESTRICTED', 'SUSPENDED'
  )),
  risk_score INTEGER NOT NULL DEFAULT 0 CHECK (risk_score >= 0 AND risk_score <= 100),
  flags TEXT[] DEFAULT '{}',
  evidence_summary TEXT,
  kill_switch_active BOOLEAN NOT NULL DEFAULT false,
  last_reviewed_at TIMESTAMPTZ,
  reviewed_by TEXT,
  review_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_abuse_record_account UNIQUE (account_id)
);

CREATE INDEX IF NOT EXISTS idx_abuse_account ON platform_abuse_records (account_id);
CREATE INDEX IF NOT EXISTS idx_abuse_state ON platform_abuse_records (state);
CREATE INDEX IF NOT EXISTS idx_abuse_risk ON platform_abuse_records (risk_score DESC);

ALTER TABLE platform_abuse_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Super admins can manage abuse records" ON platform_abuse_records;
CREATE POLICY "Super admins can manage abuse records"
  ON platform_abuse_records
  FOR ALL
  USING (
    public.is_super_admin()
  )
  WITH CHECK (
    public.is_super_admin()
  );

DROP POLICY IF EXISTS "Account members can view own abuse status" ON platform_abuse_records;
CREATE POLICY "Account members can view own abuse status"
  ON platform_abuse_records
  FOR SELECT
  USING (
    account_id IN (
      SELECT account_id FROM profiles WHERE user_id = auth.uid()
    )
  );

-- ------------------------------------------------------------
-- 2. Feature Flags & Plan Entitlements Table
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS platform_feature_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flag_key TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  state TEXT NOT NULL DEFAULT 'OFF' CHECK (state IN (
    'ON', 'OFF', 'SOON', 'BETA', 'TRIAL', 'SCHEDULED'
  )),
  eligible_plans TEXT[] NOT NULL DEFAULT '{starter, pro, enterprise}',
  rollout_percentage INTEGER NOT NULL DEFAULT 100 CHECK (rollout_percentage >= 0 AND rollout_percentage <= 100),
  is_emergency_disabled BOOLEAN NOT NULL DEFAULT false,
  scheduled_release_at TIMESTAMPTZ,
  audit_history JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE platform_feature_flags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Super admins can manage feature flags" ON platform_feature_flags;
CREATE POLICY "Super admins can manage feature flags"
  ON platform_feature_flags
  FOR ALL
  USING (
    public.is_super_admin()
  )
  WITH CHECK (
    public.is_super_admin()
  );

DROP POLICY IF EXISTS "Users can read feature flags" ON platform_feature_flags;
CREATE POLICY "Users can read feature flags"
  ON platform_feature_flags
  FOR SELECT
  USING (true);

-- ------------------------------------------------------------
-- 3. Tenant Data Export & Deletion Governance Table
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS platform_data_export_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  requested_by UUID NOT NULL REFERENCES auth.users(id),
  request_type TEXT NOT NULL CHECK (request_type IN ('export', 'deletion')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'processing', 'completed', 'failed', 'cancelled'
  )),
  export_file_url TEXT,
  download_expires_at TIMESTAMPTZ,
  deletion_scheduled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_export_requests_account ON platform_data_export_requests (account_id, created_at DESC);

ALTER TABLE platform_data_export_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Account owners can manage their export requests" ON platform_data_export_requests;
CREATE POLICY "Account owners can manage their export requests"
  ON platform_data_export_requests
  FOR ALL
  USING (
    account_id IN (
      SELECT account_id FROM profiles WHERE user_id = auth.uid() AND role = 'owner'
    )
  )
  WITH CHECK (
    account_id IN (
      SELECT account_id FROM profiles WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

DROP POLICY IF EXISTS "Super admins can view all export requests" ON platform_data_export_requests;
CREATE POLICY "Super admins can view all export requests"
  ON platform_data_export_requests
  FOR SELECT
  USING (
    public.is_super_admin()
  );
