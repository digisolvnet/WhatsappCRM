-- ============================================================
-- Migration 046: Ensure All Profiles Are Linked to Valid Accounts
-- ============================================================

DO $$
DECLARE
  v_rec RECORD;
  v_acc_id UUID;
  v_support_user_id UUID;
  v_target_acc_id UUID;
BEGIN
  -- 1. Specifically link support@digisolvnet.com to its account
  SELECT id INTO v_support_user_id FROM auth.users WHERE LOWER(email) = 'support@digisolvnet.com' LIMIT 1;
  
  IF v_support_user_id IS NOT NULL THEN
    -- Find the account (by billing_email, owner_user_id, or name)
    SELECT id INTO v_target_acc_id 
    FROM accounts 
    WHERE LOWER(billing_email) = 'support@digisolvnet.com' 
       OR owner_user_id = v_support_user_id
       OR name ILIKE '%Aniket%'
       OR name ILIKE '%Digisolv%'
    ORDER BY created_at DESC 
    LIMIT 1;

    -- If no account exists, create one
    IF v_target_acc_id IS NULL THEN
      INSERT INTO accounts (name, owner_user_id, billing_email, subscription_status, plan_name)
      VALUES ('DIGISOLVNET Admin Workspace', v_support_user_id, 'support@digisolvnet.com', 'active', 'Monthly Pro')
      RETURNING id INTO v_target_acc_id;
    END IF;

    -- Update or insert profile for support@digisolvnet.com
    INSERT INTO profiles (user_id, email, full_name, account_id, account_role, is_super_admin, role)
    VALUES (v_support_user_id, 'support@digisolvnet.com', 'Super Admin', v_target_acc_id, 'owner', TRUE, 'super_admin')
    ON CONFLICT (user_id) DO UPDATE
    SET account_id = v_target_acc_id,
        account_role = 'owner',
        is_super_admin = TRUE,
        role = 'super_admin',
        email = 'support@digisolvnet.com';

    -- Ensure accounts row has owner_user_id pointing to support@digisolvnet.com
    UPDATE accounts 
    SET owner_user_id = v_support_user_id,
        billing_email = 'support@digisolvnet.com'
    WHERE id = v_target_acc_id;
  END IF;

  -- 2. General self-healing: link ANY profile where account_id is NULL
  FOR v_rec IN 
    SELECT p.user_id, p.email, p.full_name 
    FROM profiles p 
    WHERE p.account_id IS NULL
  LOOP
    -- Look for existing account
    SELECT id INTO v_acc_id 
    FROM accounts 
    WHERE owner_user_id = v_rec.user_id 
       OR (billing_email IS NOT NULL AND LOWER(billing_email) = LOWER(v_rec.email))
    ORDER BY created_at DESC
    LIMIT 1;

    -- If none, create one
    IF v_acc_id IS NULL THEN
      INSERT INTO accounts (name, owner_user_id, billing_email, subscription_status)
      VALUES (COALESCE(NULLIF(v_rec.full_name, ''), v_rec.email, 'Workspace'), v_rec.user_id, v_rec.email, 'active')
      RETURNING id INTO v_acc_id;
    END IF;

    UPDATE profiles
    SET account_id = v_acc_id,
        account_role = COALESCE(account_role, 'owner')
    WHERE user_id = v_rec.user_id;
  END LOOP;
END $$;
