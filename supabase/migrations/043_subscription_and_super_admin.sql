-- Migration 043: Multi-tenant Subscription SaaS & Super Admin CRM
-- Adds subscription management to accounts, super-admin privileges, and payment reminder tracking.

-- 1. Extend accounts with subscription billing metadata
ALTER TABLE accounts
  ADD COLUMN IF NOT EXISTS subscription_status TEXT NOT NULL DEFAULT 'trial'
    CHECK (subscription_status IN ('trial', 'active', 'past_due', 'suspended', 'canceled')),
  ADD COLUMN IF NOT EXISTS plan_name TEXT NOT NULL DEFAULT 'Monthly Pro',
  ADD COLUMN IF NOT EXISTS monthly_price NUMERIC(10, 2) NOT NULL DEFAULT 49.00,
  ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'USD',
  ADD COLUMN IF NOT EXISTS billing_cycle TEXT NOT NULL DEFAULT 'monthly',
  ADD COLUMN IF NOT EXISTS current_period_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS current_period_ends_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 days'),
  ADD COLUMN IF NOT EXISTS billing_phone TEXT,
  ADD COLUMN IF NOT EXISTS billing_email TEXT,
  ADD COLUMN IF NOT EXISTS payment_link TEXT,
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS auto_reminder_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS last_reminder_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reminder_count INTEGER NOT NULL DEFAULT 0;

-- Index for cron lookups of expiring/due subscriptions
CREATE INDEX IF NOT EXISTS idx_accounts_subscription_expiry
  ON accounts (subscription_status, current_period_ends_at);

-- 2. Add is_super_admin flag to profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS is_super_admin BOOLEAN NOT NULL DEFAULT FALSE;

-- 3. Payment history log for accounting & audit
CREATE TABLE IF NOT EXISTS subscription_payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  amount NUMERIC(10, 2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'refunded', 'failed')),
  payment_method TEXT NOT NULL DEFAULT 'manual', -- 'stripe', 'razorpay', 'upi', 'bank_transfer', 'manual'
  reference_id TEXT,
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  notes TEXT,
  recorded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sub_payments_account
  ON subscription_payments (account_id, created_at DESC);

ALTER TABLE subscription_payments ENABLE ROW LEVEL SECURITY;

-- Super admins and service role can manage payment logs
DROP POLICY IF EXISTS "Super admins can manage subscription payments" ON subscription_payments;
CREATE POLICY "Super admins can manage subscription payments"
  ON subscription_payments
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid() AND profiles.is_super_admin = TRUE
    )
  );

-- Account members can view their own payment history
DROP POLICY IF EXISTS "Account members can view own payments" ON subscription_payments;
CREATE POLICY "Account members can view own payments"
  ON subscription_payments
  FOR SELECT
  USING (
    account_id IN (
      SELECT account_id FROM profiles WHERE user_id = auth.uid()
    )
  );

-- 4. Global platform / SaaS billing settings
CREATE TABLE IF NOT EXISTS platform_billing_settings (
  id TEXT PRIMARY KEY DEFAULT 'default',
  default_monthly_price NUMERIC(10, 2) NOT NULL DEFAULT 49.00,
  default_currency TEXT NOT NULL DEFAULT 'USD',
  default_trial_days INTEGER NOT NULL DEFAULT 7,
  default_payment_link TEXT DEFAULT '',
  super_admin_whatsapp TEXT DEFAULT '',
  reminder_days_before INTEGER[] NOT NULL DEFAULT '{3, 1, 0}',
  reminder_message_template TEXT NOT NULL DEFAULT 'Hello {{name}}, your WhatsApp CRM subscription for {{account_name}} is due on {{due_date}}. To keep your CRM and WhatsApp messaging active, please complete your monthly payment of {{amount}} here: {{payment_link}}. Thank you!',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insert initial default settings row if missing
INSERT INTO platform_billing_settings (id)
VALUES ('default')
ON CONFLICT (id) DO NOTHING;

ALTER TABLE platform_billing_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read platform settings" ON platform_billing_settings;
CREATE POLICY "Anyone can read platform settings"
  ON platform_billing_settings
  FOR SELECT
  TO authenticated
  USING (TRUE);

DROP POLICY IF EXISTS "Only super admins can update platform settings" ON platform_billing_settings;
CREATE POLICY "Only super admins can update platform settings"
  ON platform_billing_settings
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid() AND profiles.is_super_admin = TRUE
    )
  );
