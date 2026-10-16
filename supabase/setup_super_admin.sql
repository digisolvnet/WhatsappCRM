-- ==============================================================================
-- DIGISOLVNET WhatsApp CRM — Super Admin Setup Script
-- Target Admin: support@digisolvnet.com
-- Password:     DigiSolvNet@2026!Admin
-- ==============================================================================

-- Enable required pgcrypto extension for secure bcrypt password hashing
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

DO $$
DECLARE
  v_admin_email TEXT := 'support@digisolvnet.com';
  v_admin_password TEXT := 'DigiSolvNet@2026!Admin'; -- Change anytime via Supabase Auth or Settings
  v_user_id UUID;
  v_account_id UUID;
  v_encrypted_password TEXT;
BEGIN
  -- 1. Check if user already exists in auth.users
  SELECT id INTO v_user_id FROM auth.users WHERE LOWER(email) = LOWER(v_admin_email) LIMIT 1;

  -- 2. If user does not exist, create the auth record
  IF v_user_id IS NULL THEN
    v_user_id := uuid_generate_v4();
    v_encrypted_password := crypt(v_admin_password, gen_salt('bf', 10));

    INSERT INTO auth.users (
      id,
      instance_id,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      role,
      aud
    ) VALUES (
      v_user_id,
      '00000000-0000-0000-0000-000000000000',
      v_admin_email,
      v_encrypted_password,
      NOW(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"DIGISOLVNET Admin","email":"support@digisolvnet.com"}'::jsonb,
      NOW(),
      NOW(),
      'authenticated',
      'authenticated'
    );

    -- Insert identity record for email login
    INSERT INTO auth.identities (
      id,
      user_id,
      identity_data,
      provider,
      provider_id,
      last_sign_in_at,
      created_at,
      updated_at
    ) VALUES (
      uuid_generate_v4(),
      v_user_id,
      format('{"sub":"%s","email":"%s"}', v_user_id, v_admin_email)::jsonb,
      'email',
      v_user_id::text,
      NOW(),
      NOW(),
      NOW()
    );
  ELSE
    -- If user already exists, ensure email is confirmed
    UPDATE auth.users
    SET email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
        updated_at = NOW()
    WHERE id = v_user_id;
  END IF;

  -- 3. Ensure a primary root organization account exists
  SELECT id INTO v_account_id FROM accounts WHERE billing_email = v_admin_email OR name = 'DIGISOLVNET Central' LIMIT 1;

  IF v_account_id IS NULL THEN
    v_account_id := uuid_generate_v4();
    INSERT INTO accounts (
      id,
      name,
      billing_email,
      subscription_status,
      plan_name,
      monthly_price,
      currency,
      billing_cycle,
      current_period_start,
      current_period_ends_at,
      auto_reminder_enabled,
      created_at,
      updated_at
    ) VALUES (
      v_account_id,
      'DIGISOLVNET Central',
      v_admin_email,
      'active',
      'Enterprise Unlimited',
      0.00,
      'INR',
      'annual',
      NOW(),
      NOW() + INTERVAL '10 years',
      FALSE,
      NOW(),
      NOW()
    );
  END IF;

  -- 4. Upsert Admin Profile with Super Admin Privileges
  INSERT INTO profiles (
    user_id,
    full_name,
    email,
    role,
    account_id,
    account_role,
    is_super_admin,
    created_at,
    updated_at
  ) VALUES (
    v_user_id,
    'DIGISOLVNET Admin',
    v_admin_email,
    'super_admin',
    v_account_id,
    'owner',
    TRUE,
    NOW(),
    NOW()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    role = 'super_admin',
    account_id = v_account_id,
    account_role = 'owner',
    is_super_admin = TRUE,
    updated_at = NOW();

  -- 5. Add or update account membership
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'account_members') THEN
    INSERT INTO account_members (
      account_id,
      user_id,
      role,
      created_at,
      updated_at
    ) VALUES (
      v_account_id,
      v_user_id,
      'owner',
      NOW(),
      NOW()
    )
    ON CONFLICT (account_id, user_id) DO UPDATE SET
      role = 'owner',
      updated_at = NOW();
  END IF;

  RAISE NOTICE 'SUCCESS: support@digisolvnet.com has been configured as SUPER ADMIN (User ID: %)', v_user_id;
END $$;

-- Verify the admin configuration
SELECT 
  p.email,
  p.full_name,
  p.role,
  p.account_role,
  p.is_super_admin,
  a.name AS account_name,
  a.subscription_status
FROM profiles p
LEFT JOIN accounts a ON a.id = p.account_id
WHERE p.email = 'support@digisolvnet.com';
