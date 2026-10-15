-- ============================================================
-- Migration 047: Fix 23502 NOT NULL Constraint & Link All Profiles
-- ============================================================

-- 1. Ensure account_id on profiles can be safely populated without constraint failure
ALTER TABLE profiles ALTER COLUMN account_id DROP NOT NULL;

-- 2. Ensure all subscription columns exist on accounts
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

ALTER TABLE profiles 
  ADD COLUMN IF NOT EXISTS is_super_admin BOOLEAN NOT NULL DEFAULT FALSE;

-- 3. Smart Account Provisioning & Transfer
DO $$
DECLARE
  v_old_user_id UUID;
  v_new_user_id UUID;
  v_primary_account_id UUID;
  v_rec RECORD;
  v_acc_id UUID;
BEGIN
  -- Check user IDs in auth.users
  SELECT id INTO v_old_user_id FROM auth.users WHERE LOWER(email) = 'developer.aniketgarg@gmail.com' LIMIT 1;
  SELECT id INTO v_new_user_id FROM auth.users WHERE LOWER(email) = 'support@digisolvnet.com' LIMIT 1;

  -- Find the primary account (belonging to Aniket / developer / support)
  SELECT id INTO v_primary_account_id 
  FROM accounts 
  WHERE LOWER(billing_email) IN ('support@digisolvnet.com', 'developer.aniketgarg@gmail.com')
     OR owner_user_id IN (v_old_user_id, v_new_user_id)
     OR name ILIKE '%Aniket%'
     OR name ILIKE '%Digisolv%'
  ORDER BY created_at DESC 
  LIMIT 1;

  -- If no account exists yet, create it
  IF v_primary_account_id IS NULL THEN
    INSERT INTO accounts (name, owner_user_id, billing_email, subscription_status, plan_name)
    VALUES ('DIGISOLVNET Admin Workspace', COALESCE(v_new_user_id, v_old_user_id), 'support@digisolvnet.com', 'active', 'Monthly Pro')
    RETURNING id INTO v_primary_account_id;
  END IF;

  -- SCENARIO A: support@digisolvnet.com exists in auth.users
  IF v_new_user_id IS NOT NULL THEN
    -- Ensure profile exists for support@digisolvnet.com with primary_account_id
    INSERT INTO profiles (user_id, email, full_name, account_id, account_role, is_super_admin, role)
    VALUES (v_new_user_id, 'support@digisolvnet.com', 'Aniket Garg', v_primary_account_id, 'owner', TRUE, 'super_admin')
    ON CONFLICT (user_id) DO UPDATE
    SET account_id = v_primary_account_id,
        account_role = 'owner',
        is_super_admin = TRUE,
        role = 'super_admin',
        email = 'support@digisolvnet.com';

    -- Point account to support@digisolvnet.com
    UPDATE accounts
    SET owner_user_id = v_new_user_id,
        billing_email = 'support@digisolvnet.com'
    WHERE id = v_primary_account_id;

    -- Demote old user if exists
    IF v_old_user_id IS NOT NULL AND v_old_user_id <> v_new_user_id THEN
      UPDATE profiles SET is_super_admin = FALSE, role = 'user' WHERE user_id = v_old_user_id;
    END IF;

  -- SCENARIO B: Only developer.aniketgarg@gmail.com exists in auth.users -> rename it directly!
  ELSIF v_old_user_id IS NOT NULL THEN
    UPDATE auth.users
    SET email = 'support@digisolvnet.com',
        email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
        raw_user_meta_data = jsonb_set(COALESCE(raw_user_meta_data, '{}'::jsonb), '{email}', '"support@digisolvnet.com"')
    WHERE id = v_old_user_id;

    BEGIN
      UPDATE auth.identities
      SET identity_data = jsonb_set(COALESCE(identity_data, '{}'::jsonb), '{email}', '"support@digisolvnet.com"')
      WHERE user_id = v_old_user_id;
    EXCEPTION WHEN OTHERS THEN END;

    INSERT INTO profiles (user_id, email, full_name, account_id, account_role, is_super_admin, role)
    VALUES (v_old_user_id, 'support@digisolvnet.com', 'Aniket Garg', v_primary_account_id, 'owner', TRUE, 'super_admin')
    ON CONFLICT (user_id) DO UPDATE
    SET email = 'support@digisolvnet.com',
        account_id = v_primary_account_id,
        account_role = 'owner',
        is_super_admin = TRUE,
        role = 'super_admin';

    UPDATE accounts
    SET owner_user_id = v_old_user_id,
        billing_email = 'support@digisolvnet.com'
    WHERE id = v_primary_account_id;
  END IF;

  -- 4. Create missing profiles and accounts for ANY other user in auth.users
  FOR v_rec IN 
    SELECT u.id, u.email, COALESCE(u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1), 'User') as name
    FROM auth.users u
    WHERE NOT EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = u.id)
  LOOP
    -- Look for or create an account for this user
    SELECT id INTO v_acc_id FROM accounts WHERE owner_user_id = v_rec.id OR LOWER(billing_email) = LOWER(v_rec.email) LIMIT 1;
    IF v_acc_id IS NULL THEN
      INSERT INTO accounts (name, owner_user_id, billing_email, subscription_status)
      VALUES (v_rec.name, v_rec.id, v_rec.email, 'active')
      RETURNING id INTO v_acc_id;
    END IF;

    -- Insert profile with valid account_id (never null)
    INSERT INTO profiles (user_id, email, full_name, account_id, account_role, is_super_admin, role)
    VALUES (
      v_rec.id, 
      v_rec.email, 
      v_rec.name, 
      v_acc_id, 
      'owner', 
      (LOWER(v_rec.email) = 'support@digisolvnet.com'),
      CASE WHEN LOWER(v_rec.email) = 'support@digisolvnet.com' THEN 'super_admin' ELSE 'owner' END
    );
  END LOOP;

  -- 5. Fix any existing profile rows where account_id is still NULL
  FOR v_rec IN 
    SELECT p.user_id, p.email, p.full_name 
    FROM profiles p 
    WHERE p.account_id IS NULL
  LOOP
    SELECT id INTO v_acc_id FROM accounts WHERE owner_user_id = v_rec.user_id OR LOWER(billing_email) = LOWER(v_rec.email) LIMIT 1;
    IF v_acc_id IS NULL THEN
      INSERT INTO accounts (name, owner_user_id, billing_email, subscription_status)
      VALUES (COALESCE(NULLIF(v_rec.full_name, ''), v_rec.email, 'Workspace'), v_rec.user_id, v_rec.email, 'active')
      RETURNING id INTO v_acc_id;
    END IF;

    UPDATE profiles SET account_id = v_acc_id, account_role = 'owner' WHERE user_id = v_rec.user_id;
  END LOOP;

  -- Ensure only support@digisolvnet.com has is_super_admin = TRUE
  UPDATE profiles
  SET is_super_admin = FALSE
  WHERE LOWER(email) <> 'support@digisolvnet.com' AND is_super_admin = TRUE;
END $$;

-- 6. Helper Function & Non-Recursive RLS Policies
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    CASE 
      WHEN LOWER(COALESCE(auth.jwt() ->> 'email', '')) = 'support@digisolvnet.com' THEN TRUE
      ELSE COALESCE(
        (
          SELECT (p.is_super_admin = TRUE OR p.role = 'super_admin' OR LOWER(p.email) = 'support@digisolvnet.com')
          FROM profiles p
          WHERE p.user_id = auth.uid()
          LIMIT 1
        ),
        FALSE
      )
    END;
$$;

ALTER FUNCTION public.is_super_admin() OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.is_super_admin() TO authenticated, service_role, anon;

-- Clean up recursive policies on profiles
DROP POLICY IF EXISTS "Super admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Super admins can update all profiles" ON profiles;
DROP POLICY IF EXISTS profiles_select ON profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS profiles_update ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

CREATE POLICY profiles_select ON profiles
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id 
    OR is_account_member(account_id)
    OR is_super_admin()
  );

CREATE POLICY profiles_update ON profiles
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = user_id 
    OR is_super_admin()
  );

-- Accounts Policies
DROP POLICY IF EXISTS "Super admins can view all accounts" ON accounts;
DROP POLICY IF EXISTS "Super admins can update all accounts" ON accounts;
DROP POLICY IF EXISTS "Super admins can insert accounts" ON accounts;
DROP POLICY IF EXISTS accounts_select ON accounts;
DROP POLICY IF EXISTS accounts_update ON accounts;
DROP POLICY IF EXISTS accounts_insert ON accounts;

CREATE POLICY accounts_select ON accounts
  FOR SELECT
  TO authenticated
  USING (
    is_account_member(id) 
    OR is_super_admin()
  );

CREATE POLICY accounts_update ON accounts
  FOR UPDATE
  TO authenticated
  USING (
    is_account_member(id, 'admin') 
    OR is_super_admin()
  );

CREATE POLICY accounts_insert ON accounts
  FOR INSERT
  TO authenticated
  WITH CHECK (
    is_super_admin()
  );
