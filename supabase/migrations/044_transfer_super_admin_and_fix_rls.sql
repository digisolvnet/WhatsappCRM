-- Migration 044: Transfer Super Admin to support@digisolvnet.com & Enable RLS Access for Super Admins
-- 1. Ensure required columns exist
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_super_admin BOOLEAN NOT NULL DEFAULT FALSE;

-- 2. Smart Transfer of Account & Super Admin privileges to support@digisolvnet.com
DO $$
DECLARE
  v_old_user_id UUID;
  v_new_user_id UUID;
  v_account_id UUID;
BEGIN
  -- Look for old account owner
  SELECT id INTO v_old_user_id FROM auth.users WHERE email = 'developer.aniketgarg@gmail.com';
  -- Look for new super admin user
  SELECT id INTO v_new_user_id FROM auth.users WHERE email = 'support@digisolvnet.com';

  -- Case A: support@digisolvnet.com already registered as a separate user
  IF v_new_user_id IS NOT NULL THEN
    -- If old user existed, transfer their account to support@digisolvnet.com
    IF v_old_user_id IS NOT NULL THEN
      SELECT account_id INTO v_account_id FROM profiles WHERE user_id = v_old_user_id;
      IF v_account_id IS NOT NULL THEN
        UPDATE profiles
        SET account_id = v_account_id,
            account_role = 'owner'
        WHERE user_id = v_new_user_id;

        -- Update account owner reference if applicable
        UPDATE accounts SET billing_email = 'support@digisolvnet.com' WHERE id = v_account_id;
      END IF;

      -- Revoke super admin from old user
      UPDATE profiles
      SET is_super_admin = FALSE, role = 'user'
      WHERE user_id = v_old_user_id;
    END IF;

    -- Make support@digisolvnet.com Super Admin
    UPDATE profiles
    SET is_super_admin = TRUE, role = 'super_admin'
    WHERE user_id = v_new_user_id;

  -- Case B: support@digisolvnet.com has not registered yet, but developer.aniketgarg@gmail.com exists
  -- Seamlessly rename the existing account to support@digisolvnet.com so existing login password continues working!
  ELSIF v_old_user_id IS NOT NULL THEN
    UPDATE auth.users
    SET email = 'support@digisolvnet.com',
        email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
        raw_user_meta_data = jsonb_set(COALESCE(raw_user_meta_data, '{}'::jsonb), '{email}', '"support@digisolvnet.com"')
    WHERE id = v_old_user_id;

    UPDATE profiles
    SET email = 'support@digisolvnet.com',
        is_super_admin = TRUE,
        role = 'super_admin'
    WHERE user_id = v_old_user_id;

    -- Update billing email on their account
    UPDATE accounts
    SET billing_email = 'support@digisolvnet.com'
    WHERE id IN (SELECT account_id FROM profiles WHERE user_id = v_old_user_id);
  END IF;

  -- Ensure any other emails are demoted from super admin
  UPDATE profiles
  SET is_super_admin = FALSE
  WHERE email IN ('annugarg33@gmail.com', 'developer.aniketgarg@gmail.com')
    AND email <> 'support@digisolvnet.com';
END $$;

-- 3. Super Admin RLS Policies: Allow Super Admins to see ALL accounts and customer profiles
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
