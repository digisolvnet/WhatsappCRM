-- ============================================================
-- Migration 050: Platform Auditing & Multi-Tenant Data Isolation
--
-- Supports the Target Architecture:
-- 1. Project A: Central Platform / Admin CRM audit logs & telemetry
-- 2. Project B: Customer CRM application data with strict RLS isolation
-- ============================================================

-- ------------------------------------------------------------
-- 1. Platform Security & Audit Logs (Project A compatible)
-- Tracks security events, cross-tenant attempts, and admin actions.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS platform_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'critical')),
  actor_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  target_account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
  ip_address TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_event_created
  ON platform_audit_logs (event_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_account
  ON platform_audit_logs (target_account_id, created_at DESC);

ALTER TABLE platform_audit_logs ENABLE ROW LEVEL SECURITY;

-- Super admins and service role can read/manage audit logs
DROP POLICY IF EXISTS "Super admins can view audit logs" ON platform_audit_logs;
CREATE POLICY "Super admins can view audit logs"
  ON platform_audit_logs
  FOR ALL
  USING (
    public.is_super_admin()
  )
  WITH CHECK (
    public.is_super_admin()
  );

-- ------------------------------------------------------------
-- 2. Tenant Usage Telemetry (Project A compatible)
-- Aggregated metadata for Central Admin CRM & quota monitoring.
-- Explicitly excludes private customer chat bodies & media attachments.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tenant_usage_telemetry (
  account_id UUID PRIMARY KEY REFERENCES accounts(id) ON DELETE CASCADE,
  account_name TEXT NOT NULL,
  total_contacts INTEGER NOT NULL DEFAULT 0,
  total_conversations INTEGER NOT NULL DEFAULT 0,
  messages_sent_30d INTEGER NOT NULL DEFAULT 0,
  active_flows_count INTEGER NOT NULL DEFAULT 0,
  subscription_status TEXT NOT NULL DEFAULT 'active',
  plan_name TEXT NOT NULL DEFAULT 'Monthly Pro',
  current_period_ends_at TIMESTAMPTZ,
  last_active_at TIMESTAMPTZ,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE tenant_usage_telemetry ENABLE ROW LEVEL SECURITY;

-- Super admin can view all tenant telemetry
DROP POLICY IF EXISTS "Super admins can manage telemetry" ON tenant_usage_telemetry;
CREATE POLICY "Super admins can manage telemetry"
  ON tenant_usage_telemetry
  FOR ALL
  USING (
    public.is_super_admin()
  )
  WITH CHECK (
    public.is_super_admin()
  );

-- Account members can view their own telemetry summary
DROP POLICY IF EXISTS "Members can view own telemetry" ON tenant_usage_telemetry;
CREATE POLICY "Members can view own telemetry"
  ON tenant_usage_telemetry
  FOR SELECT
  USING (
    is_account_member(account_id, 'viewer')
  );

-- ------------------------------------------------------------
-- 3. SQL Tenant Identity Helper
-- Returns the caller's authorized account_id directly from profiles.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.current_tenant_id()
RETURNS UUID
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT account_id FROM profiles WHERE user_id = auth.uid() LIMIT 1;
$$;
