-- ============================================================
-- Migration 054: Flow Execution Quotas, History & Lifecycle Controls
--
-- Supports Phase 6:
-- 1. Widens flows.status to include 'paused'.
-- 2. flow_execution_quotas: Tenant rate limits, quotas, and test mode flags.
-- 3. flow_execution_logs: Execution history, failure tracking, retries, and idempotency.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Widen flows.status to allow 'paused'
-- ------------------------------------------------------------
ALTER TABLE flows
  DROP CONSTRAINT IF EXISTS flows_status_check;

ALTER TABLE flows
  ADD CONSTRAINT flows_status_check
  CHECK (status IN ('draft', 'active', 'paused', 'archived'));

-- ------------------------------------------------------------
-- 2. Flow Execution Quotas & Limits
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS flow_execution_quotas (
  account_id UUID PRIMARY KEY REFERENCES accounts(id) ON DELETE CASCADE,
  monthly_execution_quota INTEGER NOT NULL DEFAULT 1000,
  executions_this_month INTEGER NOT NULL DEFAULT 0,
  rate_limit_per_minute INTEGER NOT NULL DEFAULT 60,
  is_test_mode_enabled BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE flow_execution_quotas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Account members can view flow quotas" ON flow_execution_quotas;
CREATE POLICY "Account members can view flow quotas"
  ON flow_execution_quotas
  FOR SELECT
  USING (
    account_id IN (
      SELECT account_id FROM profiles WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Super admins can manage flow quotas" ON flow_execution_quotas;
CREATE POLICY "Super admins can manage flow quotas"
  ON flow_execution_quotas
  FOR ALL
  USING (
    public.is_super_admin()
  )
  WITH CHECK (
    public.is_super_admin()
  );

-- ------------------------------------------------------------
-- 3. Flow Execution Logs (History, Idempotency & Failure Reasons)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS flow_execution_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  flow_id UUID REFERENCES flows(id) ON DELETE CASCADE,
  flow_run_id UUID REFERENCES flow_runs(id) ON DELETE CASCADE,
  trigger_type TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN (
    'success', 'failed', 'retrying', 'rate_limited', 'suspended_blocked', 'test_simulated'
  )),
  retry_count INTEGER NOT NULL DEFAULT 0,
  max_retries INTEGER NOT NULL DEFAULT 3,
  failure_reason TEXT,
  execution_duration_ms INTEGER,
  is_test_mode BOOLEAN NOT NULL DEFAULT false,
  idempotency_key TEXT UNIQUE,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_flow_logs_account ON flow_execution_logs (account_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_flow_logs_idempotency ON flow_execution_logs (idempotency_key);
CREATE INDEX IF NOT EXISTS idx_flow_logs_flow ON flow_execution_logs (flow_id);

ALTER TABLE flow_execution_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Account members can view flow execution logs" ON flow_execution_logs;
CREATE POLICY "Account members can view flow execution logs"
  ON flow_execution_logs
  FOR SELECT
  USING (
    account_id IN (
      SELECT account_id FROM profiles WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Super admins can view all flow execution logs" ON flow_execution_logs;
CREATE POLICY "Super admins can view all flow execution logs"
  ON flow_execution_logs
  FOR ALL
  USING (
    public.is_super_admin()
  );
