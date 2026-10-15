-- ============================================================
-- Migration 048: Super Admin Account Member & CRM Inbox Visibility
--
-- Ensures public.is_account_member() returns TRUE for Super Admins
-- (public.is_super_admin() = TRUE), granting platform Super Admin
-- full visibility and access to conversations, messages, and contacts
-- across all tenant workspaces in the CRM Inbox.
-- ============================================================

CREATE OR REPLACE FUNCTION public.is_account_member(
  target_account_id UUID,
  min_role account_role_enum DEFAULT 'viewer'
) RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT (
    public.is_super_admin()
    OR EXISTS (
      SELECT 1
      FROM profiles p
      WHERE p.user_id = auth.uid()
        AND p.account_id = target_account_id
        AND CASE p.account_role
              WHEN 'owner'  THEN 4
              WHEN 'admin'  THEN 3
              WHEN 'agent'  THEN 2
              WHEN 'viewer' THEN 1
            END
          >=
            CASE min_role
              WHEN 'owner'  THEN 4
              WHEN 'admin'  THEN 3
              WHEN 'agent'  THEN 2
              WHEN 'viewer' THEN 1
            END
    )
  );
$$;

ALTER FUNCTION public.is_account_member(UUID, account_role_enum) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.is_account_member(UUID, account_role_enum) TO authenticated, service_role;
