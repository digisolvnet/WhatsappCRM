-- ============================================================
-- Migration 045: Fix Infinite Recursion in Profiles RLS Policy
-- ============================================================

-- 1. Create a SECURITY DEFINER function to check super admin status without RLS recursion.
-- When a SECURITY DEFINER function runs, PostgreSQL executes it with the permissions of
-- the owner (postgres), completely bypassing table RLS and avoiding infinite recursion loops.
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

-- 2. Drop the recursive policies on `profiles`
DROP POLICY IF EXISTS "Super admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Super admins can update all profiles" ON profiles;
DROP POLICY IF EXISTS profiles_select ON profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS profiles_update ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

-- 3. Re-create clean, non-recursive SELECT policy on `profiles`
-- Every user can view their own profile (auth.uid() = user_id), or teammates in their account,
-- or super admins can view all profiles without recursive subqueries.
CREATE POLICY profiles_select ON profiles
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id 
    OR is_account_member(account_id)
    OR is_super_admin()
  );

-- Re-create clean UPDATE policy on `profiles`
CREATE POLICY profiles_update ON profiles
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = user_id 
    OR is_super_admin()
  );

-- 4. Clean up and update policies on `accounts` to use `is_super_admin()`
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

-- 5. Clean up policies on `subscription_payments` and `platform_billing_settings`
DROP POLICY IF EXISTS "Super admins can manage subscription payments" ON subscription_payments;
CREATE POLICY "Super admins can manage subscription payments"
  ON subscription_payments
  FOR ALL
  TO authenticated
  USING (is_super_admin());

DROP POLICY IF EXISTS "Only super admins can update platform settings" ON platform_billing_settings;
CREATE POLICY "Only super admins can update platform settings"
  ON platform_billing_settings
  FOR ALL
  TO authenticated
  USING (is_super_admin());
