-- ============================================================
-- Migration 053: Tenant Business Catalogue & Order Management
--
-- Supports Phase 5:
-- 1. tenant_products: Physical products and services with variants, SKU uniqueness per tenant,
--    tax settings, stock tracking, and service duration/booking terms.
-- 2. tenant_orders: Scoped customer orders with order references, lifecycle status,
--    payment status, fulfilment state, and verified payment tracking.
-- 3. tenant_order_items: Line items linked to products/services with price, quantity, and scheduling.
-- 4. tenant_catalogue_settings: Public storefront options, inventory rules, and WhatsApp templates.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Tenant Products & Services Table
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tenant_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sku TEXT NOT NULL,
  description TEXT,
  category TEXT DEFAULT 'General',
  images TEXT[] DEFAULT '{}',
  price NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (price >= 0),
  currency TEXT NOT NULL DEFAULT 'INR',
  tax_rate_percent NUMERIC(5,2) DEFAULT 0.00 CHECK (tax_rate_percent >= 0 AND tax_rate_percent <= 100),
  item_type TEXT NOT NULL DEFAULT 'product' CHECK (item_type IN ('product', 'service')),
  stock_quantity INTEGER DEFAULT 0,
  track_inventory BOOLEAN NOT NULL DEFAULT true,
  is_available BOOLEAN NOT NULL DEFAULT true,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'draft', 'archived')),
  variants JSONB DEFAULT '[]'::jsonb,
  service_duration_minutes INTEGER CHECK (service_duration_minutes IS NULL OR service_duration_minutes > 0),
  service_booking_requirements TEXT,
  service_terms TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_tenant_product_sku UNIQUE (account_id, sku)
);

CREATE INDEX IF NOT EXISTS idx_tenant_products_account ON tenant_products (account_id, status);
CREATE INDEX IF NOT EXISTS idx_tenant_products_category ON tenant_products (account_id, category);
CREATE INDEX IF NOT EXISTS idx_tenant_products_type ON tenant_products (account_id, item_type);
CREATE INDEX IF NOT EXISTS idx_tenant_products_sku ON tenant_products (account_id, sku);

ALTER TABLE tenant_products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Account members can manage tenant products" ON tenant_products;
CREATE POLICY "Account members can manage tenant products"
  ON tenant_products
  FOR ALL
  USING (
    account_id IN (
      SELECT account_id FROM profiles WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    account_id IN (
      SELECT account_id FROM profiles WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Public can view active available products" ON tenant_products;
CREATE POLICY "Public can view active available products"
  ON tenant_products
  FOR SELECT
  USING (
    status = 'active' AND is_available = true
  );

-- ------------------------------------------------------------
-- 2. Tenant Orders Table
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tenant_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  order_reference TEXT UNIQUE NOT NULL,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_email TEXT,
  order_type TEXT NOT NULL DEFAULT 'product' CHECK (order_type IN ('product', 'service', 'mixed')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'processing', 'completed', 'cancelled', 'refunded')),
  payment_status TEXT NOT NULL DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'pending_verification', 'paid', 'partially_refunded', 'refunded', 'failed')),
  fulfilment_status TEXT NOT NULL DEFAULT 'unfulfilled' CHECK (fulfilment_status IN ('unfulfilled', 'scheduled', 'in_progress', 'fulfilled', 'cancelled')),
  currency TEXT NOT NULL DEFAULT 'INR',
  subtotal_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (subtotal_amount >= 0),
  tax_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (tax_amount >= 0),
  total_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (total_amount >= 0),
  notes TEXT,
  payment_reference TEXT,
  payment_verified_at TIMESTAMPTZ,
  cancellation_reason TEXT,
  refund_amount NUMERIC(12,2) DEFAULT 0.00 CHECK (refund_amount >= 0),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tenant_orders_account ON tenant_orders (account_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tenant_orders_ref ON tenant_orders (order_reference);
CREATE INDEX IF NOT EXISTS idx_tenant_orders_contact ON tenant_orders (account_id, contact_id);
CREATE INDEX IF NOT EXISTS idx_tenant_orders_status ON tenant_orders (account_id, status);
CREATE INDEX IF NOT EXISTS idx_tenant_orders_payment ON tenant_orders (account_id, payment_status);

ALTER TABLE tenant_orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Account members can manage tenant orders" ON tenant_orders;
CREATE POLICY "Account members can manage tenant orders"
  ON tenant_orders
  FOR ALL
  USING (
    account_id IN (
      SELECT account_id FROM profiles WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    account_id IN (
      SELECT account_id FROM profiles WHERE user_id = auth.uid()
    )
  );

-- ------------------------------------------------------------
-- 3. Tenant Order Items Table
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tenant_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES tenant_orders(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  product_id UUID REFERENCES tenant_products(id) ON DELETE SET NULL,
  item_type TEXT NOT NULL DEFAULT 'product' CHECK (item_type IN ('product', 'service')),
  item_name TEXT NOT NULL,
  sku TEXT,
  variant_id TEXT,
  unit_price NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (unit_price >= 0),
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  total_price NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (total_price >= 0),
  service_scheduled_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tenant_order_items_order ON tenant_order_items (order_id);
CREATE INDEX IF NOT EXISTS idx_tenant_order_items_account ON tenant_order_items (account_id);

ALTER TABLE tenant_order_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Account members can manage tenant order items" ON tenant_order_items;
CREATE POLICY "Account members can manage tenant order items"
  ON tenant_order_items
  FOR ALL
  USING (
    account_id IN (
      SELECT account_id FROM profiles WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    account_id IN (
      SELECT account_id FROM profiles WHERE user_id = auth.uid()
    )
  );

-- ------------------------------------------------------------
-- 4. Tenant Catalogue Settings Table
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tenant_catalogue_settings (
  account_id UUID PRIMARY KEY REFERENCES accounts(id) ON DELETE CASCADE,
  catalogue_name TEXT,
  is_public_catalogue_enabled BOOLEAN DEFAULT true,
  allow_out_of_stock_orders BOOLEAN DEFAULT false,
  require_payment_before_fulfilment BOOLEAN DEFAULT true,
  order_notification_whatsapp_enabled BOOLEAN DEFAULT true,
  order_confirmation_template TEXT DEFAULT 'Hello {{customer_name}}, thank you for your order #{{order_reference}}! Total amount: {{currency}} {{total_amount}}. We are preparing your order.',
  payment_instructions_template TEXT DEFAULT 'Hi {{customer_name}}, to complete your order #{{order_reference}}, please pay {{currency}} {{total_amount}} via {{payment_link}}.',
  status_update_template TEXT DEFAULT 'Update on order #{{order_reference}}: Status is now {{order_status}}.',
  completion_feedback_template TEXT DEFAULT 'Hello {{customer_name}}, your order #{{order_reference}} has been completed. How was your experience? Reply with your feedback!',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE tenant_catalogue_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Account members can manage catalogue settings" ON tenant_catalogue_settings;
CREATE POLICY "Account members can manage catalogue settings"
  ON tenant_catalogue_settings
  FOR ALL
  USING (
    account_id IN (
      SELECT account_id FROM profiles WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    account_id IN (
      SELECT account_id FROM profiles WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Public can view catalogue settings" ON tenant_catalogue_settings;
CREATE POLICY "Public can view catalogue settings"
  ON tenant_catalogue_settings
  FOR SELECT
  USING (
    is_public_catalogue_enabled = true
  );
