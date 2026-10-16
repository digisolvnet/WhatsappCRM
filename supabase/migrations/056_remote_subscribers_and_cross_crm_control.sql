-- ==============================================================================
-- Migration 056: Remote Subscribers & Central CRM Remote Control
-- DIGISOLVNET WhatsApp CRM Master CRM Sync
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.remote_subscribers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    instance_id TEXT NOT NULL UNIQUE,
    instance_url TEXT NOT NULL,
    name TEXT NOT NULL,
    owner_name TEXT,
    owner_email TEXT,
    billing_phone TEXT,
    plan_name TEXT DEFAULT 'Monthly Pro',
    monthly_price NUMERIC(10, 2) DEFAULT 999.00,
    currency TEXT DEFAULT 'INR',
    subscription_status TEXT DEFAULT 'active',
    current_period_ends_at TIMESTAMPTZ,
    sync_secret TEXT,
    last_synced_at TIMESTAMPTZ DEFAULT now(),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_remote_subscribers_instance_id ON public.remote_subscribers(instance_id);
CREATE INDEX IF NOT EXISTS idx_remote_subscribers_status ON public.remote_subscribers(subscription_status);

-- Enable RLS
ALTER TABLE public.remote_subscribers ENABLE ROW LEVEL SECURITY;

-- Super Admin management policy
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'remote_subscribers' 
        AND policyname = 'Super admins can manage remote_subscribers'
    ) THEN
        CREATE POLICY "Super admins can manage remote_subscribers"
            ON public.remote_subscribers
            FOR ALL
            TO authenticated
            USING (
                EXISTS (
                    SELECT 1 FROM public.profiles
                    WHERE profiles.user_id = auth.uid()
                    AND (profiles.role = 'super_admin' OR profiles.is_super_admin = true)
                )
            )
            WITH CHECK (
                EXISTS (
                    SELECT 1 FROM public.profiles
                    WHERE profiles.user_id = auth.uid()
                    AND (profiles.role = 'super_admin' OR profiles.is_super_admin = true)
                )
            );
    END IF;
END $$;
