-- ============================================================
-- Migration 044: Complete SaaS Setup, Transfer to support@digisolvnet.com, & Super Admin RLS
-- ============================================================

-- STEP 1: Add all subscription & billing columns to `accounts` table
ALTER TABLE accounts
  ADD COLUMN IF NOT EXISTS subscription_status TEXT NOT NULL DEFAULT 'trial',
  ADD COLUMN IF NOT EXISTS plan_name TEXT NOT NULL DEFAULT 'Monthly Pro',
  ADD COLUMN IF NOT EXISTS monthly_price NUMERIC(10, 2) NOT NULL DEFAULT 999.00,
  ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'INR',
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

-- STEP 2: Add `is_super_admin` flag to `profiles` table
ALTER TABLE profiles 
  ADD COLUMN IF NOT EXISTS is_super_admin BOOLEAN NOT NULL DEFAULT FALSE;

-- STEP 3: Create subscription_payments table if missing
CREATE TABLE IF NOT EXISTS subscription_payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  amount NUMERIC(10, 2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'INR',
  status TEXT NOT NULL DEFAULT 'completed',
  payment_method TEXT NOT NULL DEFAULT 'manual',
  reference_id TEXT,
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  notes TEXT,
  recorded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- STEP 4: Create platform_billing_settings table if missing
CREATE TABLE IF NOT EXISTS platform_billing_settings (
  id TEXT PRIMARY KEY DEFAULT 'default',
  default_monthly_price NUMERIC(10, 2) NOT NULL DEFAULT 999.00,
  default_currency TEXT NOT NULL DEFAULT 'INR',
  default_trial_days INTEGER NOT NULL DEFAULT 14,
  default_payment_link TEXT DEFAULT '',
  super_admin_whatsapp TEXT DEFAULT '',
  reminder_days_before INTEGER[] NOT NULL DEFAULT '{3, 1, 0}',
  reminder_message_template TEXT NOT NULL DEFAULT 'Hello {{name}}, your WhatsApp CRM subscription for {{account_name}} is due on {{due_date}}. To keep your CRM and WhatsApp messaging active, please complete your monthly payment of {{amount}} here: {{payment_link}}. Thank you!',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO platform_billing_settings (id)
VALUES ('default')
ON CONFLICT (id) DO NOTHING;

-- STEP 5: Smart Account Transfer to support@digisolvnet.com
DO $$
DECLARE
  v_old_user_id UUID;
  v_new_user_id UUID;
  v_account_id UUID;
BEGIN
  SELECT id INTO v_old_user_id FROM auth.users WHERE email = 'developer.aniketgarg@gmail.com';
  SELECT id INTO v_new_user_id FROM auth.users WHERE email = 'support@digisolvnet.com';

  -- Case A: support@digisolvnet.com already registered
  IF v_new_user_id IS NOT NULL THEN
    IF v_old_user_id IS NOT NULL THEN
      SELECT account_id INTO v_account_id FROM profiles WHERE user_id = v_old_user_id;
      IF v_account_id IS NOT NULL THEN
        UPDATE profiles SET account_id = v_account_id, account_role = 'owner' WHERE user_id = v_new_user_id;
        EXECUTE 'UPDATE accounts SET billing_email = ''support@digisolvnet.com'' WHERE id = $1' USING v_account_id;
      END IF;
      UPDATE profiles SET is_super_admin = FALSE, role = 'user' WHERE user_id = v_old_user_id;
    END IF;

    UPDATE profiles SET is_super_admin = TRUE, role = 'super_admin' WHERE user_id = v_new_user_id;

  -- Case B: support@digisolvnet.com has not registered yet, rename the existing developer account directly
  ELSIF v_old_user_id IS NOT NULL THEN
    UPDATE auth.users
    SET email = 'support@digisolvnet.com',
        email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
        raw_user_meta_data = jsonb_set(COALESCE(raw_user_meta_data, '{}'::jsonb), '{email}', '"support@digisolvnet.com"')
    WHERE id = v_old_user_id;

    UPDATE profiles
    SET email = 'support@digisolvnet.com', is_super_admin = TRUE, role = 'super_admin'
    WHERE user_id = v_old_user_id;

    SELECT account_id INTO v_account_id FROM profiles WHERE user_id = v_old_user_id;
    IF v_account_id IS NOT NULL THEN
      EXECUTE 'UPDATE accounts SET billing_email = ''support@digisolvnet.com'' WHERE id = $1' USING v_account_id;
    END IF;
  END IF;

  -- Demote any other emails
  UPDATE profiles
  SET is_super_admin = FALSE
  WHERE email IN ('annugarg33@gmail.com', 'developer.aniketgarg@gmail.com')
    AND email <> 'support@digisolvnet.com';
END $$;

-- STEP 6: Super Admin RLS Policies (Allows Super Admin to view and manage ALL accounts & profiles)
DROP POLICY IF EXISTS "Super admins can view all accounts" ON accounts;
CREATE POLICY "Super admins can view all accounts" ON accounts
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
        AND (profiles.is_super_admin = TRUE OR profiles.role = 'super_admin' OR profiles.email = 'support@digisolvnet.com')
    )
  );

DROP POLICY IF EXISTS "Super admins can update all accounts" ON accounts;
CREATE POLICY "Super admins can update all accounts" ON accounts
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
        AND (profiles.is_super_admin = TRUE OR profiles.role = 'super_admin' OR profiles.email = 'support@digisolvnet.com')
    )
  );

DROP POLICY IF EXISTS "Super admins can view all profiles" ON profiles;
CREATE POLICY "Super admins can view all profiles" ON profiles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles p2
      WHERE p2.user_id = auth.uid()
        AND (p2.is_super_admin = TRUE OR p2.role = 'super_admin' OR p2.email = 'support@digisolvnet.com')
    )
  );
