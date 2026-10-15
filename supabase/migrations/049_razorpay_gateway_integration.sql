-- ============================================================
-- Migration 049: Razorpay Payment Gateway Integration
--
-- Adds Razorpay payment gateway credentials to platform billing settings
-- for Super Admin SaaS subscriptions, and creates tenant-level payment
-- gateway and payment link tables for in-chat CRM customer billing.
-- ============================================================

-- 1. Extend platform_billing_settings with Razorpay fields for Super Admin
ALTER TABLE platform_billing_settings
  ADD COLUMN IF NOT EXISTS razorpay_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS razorpay_key_id TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS razorpay_key_secret TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS razorpay_webhook_secret TEXT DEFAULT '';

-- 2. Tenant Workspace Payment Gateways (for each CRM to connect Razorpay)
CREATE TABLE IF NOT EXISTS account_payment_gateways (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'razorpay',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  key_id TEXT NOT NULL DEFAULT '',
  key_secret TEXT NOT NULL DEFAULT '',
  webhook_secret TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT account_payment_gateways_provider_key UNIQUE (account_id, provider)
);

ALTER TABLE account_payment_gateways ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Account admins can manage payment gateways" ON account_payment_gateways;
CREATE POLICY "Account admins can manage payment gateways"
  ON account_payment_gateways
  FOR ALL
  USING (
    public.is_super_admin()
    OR is_account_member(account_id, 'admin')
  )
  WITH CHECK (
    public.is_super_admin()
    OR is_account_member(account_id, 'admin')
  );

-- 3. CRM In-Chat Payment Links Table
CREATE TABLE IF NOT EXISTS crm_payment_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  deal_id UUID REFERENCES deals(id) ON DELETE SET NULL,
  created_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  razorpay_payment_link_id TEXT,
  razorpay_order_id TEXT,
  razorpay_payment_id TEXT,
  amount NUMERIC(12, 2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'INR',
  description TEXT,
  short_url TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'created', -- 'created', 'paid', 'expired', 'cancelled'
  metadata JSONB DEFAULT '{}'::jsonb,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE crm_payment_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Account agents can view and create payment links" ON crm_payment_links;
CREATE POLICY "Account agents can view and create payment links"
  ON crm_payment_links
  FOR ALL
  USING (
    public.is_super_admin()
    OR is_account_member(account_id, 'agent')
  )
  WITH CHECK (
    public.is_super_admin()
    OR is_account_member(account_id, 'agent')
  );

CREATE INDEX IF NOT EXISTS idx_crm_payment_links_account ON crm_payment_links(account_id);
CREATE INDEX IF NOT EXISTS idx_crm_payment_links_conv ON crm_payment_links(conversation_id);
CREATE INDEX IF NOT EXISTS idx_crm_payment_links_rzp_link ON crm_payment_links(razorpay_payment_link_id);
