-- ============================================================
-- Migration 051: Central Orders, Provisioning & Webhook Idempotency
--
-- Supports Phase 3:
-- 1. platform_orders: Central state machine for Razorpay SaaS subscriptions
-- 2. processed_webhook_events: Idempotency registry preventing duplicate processing
-- ============================================================

-- ------------------------------------------------------------
-- 1. Platform Orders Table
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS platform_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  razorpay_order_id TEXT UNIQUE NOT NULL,
  razorpay_payment_id TEXT,
  account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
  customer_email TEXT NOT NULL,
  customer_name TEXT,
  customer_phone TEXT,
  plan_id TEXT NOT NULL,
  plan_name TEXT NOT NULL,
  billing_cycle TEXT NOT NULL DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly', 'annual', 'custom')),
  duration_months INTEGER NOT NULL DEFAULT 1,
  amount NUMERIC(12, 2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'INR',
  status TEXT NOT NULL DEFAULT 'PENDING_PAYMENT' CHECK (status IN (
    'PENDING_PAYMENT', 'PAID', 'PROVISIONING', 'ACTIVE',
    'FAILED', 'CANCELLED', 'EXPIRED', 'SUSPENDED', 'REFUNDED'
  )),
  provisioning_status TEXT NOT NULL DEFAULT 'not_started' CHECK (provisioning_status IN (
    'not_started', 'in_progress', 'completed', 'failed'
  )),
  verification_state TEXT NOT NULL DEFAULT 'unverified' CHECK (verification_state IN (
    'unverified', 'signature_verified', 'webhook_verified'
  )),
  idempotency_key TEXT UNIQUE,
  state_history JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_platform_orders_account ON platform_orders (account_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_platform_orders_rzp_order ON platform_orders (razorpay_order_id);
CREATE INDEX IF NOT EXISTS idx_platform_orders_status ON platform_orders (status);

ALTER TABLE platform_orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Super admins can manage platform orders" ON platform_orders;
CREATE POLICY "Super admins can manage platform orders"
  ON platform_orders
  FOR ALL
  USING (
    public.is_super_admin()
  )
  WITH CHECK (
    public.is_super_admin()
  );

DROP POLICY IF EXISTS "Account members can view own orders" ON platform_orders;
CREATE POLICY "Account members can view own orders"
  ON platform_orders
  FOR SELECT
  USING (
    account_id IN (
      SELECT account_id FROM profiles WHERE user_id = auth.uid()
    )
  );

-- ------------------------------------------------------------
-- 2. Processed Webhook Events Table (Idempotency Guard)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS processed_webhook_events (
  event_id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  provider TEXT NOT NULL DEFAULT 'razorpay',
  account_id UUID,
  payload_summary JSONB DEFAULT '{}'::jsonb,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_webhook_events_processed_at ON processed_webhook_events (processed_at DESC);

ALTER TABLE processed_webhook_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Super admins can view webhook events" ON processed_webhook_events;
CREATE POLICY "Super admins can view webhook events"
  ON processed_webhook_events
  FOR ALL
  USING (
    public.is_super_admin()
  )
  WITH CHECK (
    public.is_super_admin()
  );
