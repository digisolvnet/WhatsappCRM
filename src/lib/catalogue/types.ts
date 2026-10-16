// ============================================================
// Tenant Business Catalogue & Order Types
// Supports both physical products with inventory tracking and
// services with durations, booking requirements, and no inventory.
// ============================================================

export type ItemType = "product" | "service";
export type ProductStatus = "active" | "draft" | "archived";

export interface ProductVariant {
  id: string;
  name: string;
  sku: string;
  price: number;
  stock_quantity?: number;
  attributes: Record<string, string>; // e.g. { size: "XL", color: "Blue" }
}

export interface TenantProduct {
  id: string;
  account_id: string;
  name: string;
  sku: string;
  description: string | null;
  category: string;
  images: string[];
  price: number;
  currency: string;
  tax_rate_percent: number;
  item_type: ItemType;
  stock_quantity: number;
  track_inventory: boolean;
  is_available: boolean;
  status: ProductStatus;
  variants: ProductVariant[];
  // Service-specific fields
  service_duration_minutes?: number | null;
  service_booking_requirements?: string | null;
  service_terms?: string | null;
  created_at: string;
  updated_at: string;
}

export type OrderStatus =
  | "pending"
  | "confirmed"
  | "processing"
  | "completed"
  | "cancelled"
  | "refunded";

export type OrderPaymentStatus =
  | "unpaid"
  | "pending_verification"
  | "paid"
  | "partially_refunded"
  | "refunded"
  | "failed";

export type OrderFulfilmentStatus =
  | "unfulfilled"
  | "scheduled"
  | "in_progress"
  | "fulfilled"
  | "cancelled";

export interface TenantOrderItem {
  id?: string;
  order_id?: string;
  account_id: string;
  product_id: string | null;
  item_type: ItemType;
  item_name: string;
  sku?: string | null;
  variant_id?: string | null;
  unit_price: number;
  quantity: number;
  total_price: number;
  service_scheduled_at?: string | null;
  metadata?: Record<string, any>;
}

export interface TenantOrder {
  id: string;
  account_id: string;
  order_reference: string;
  contact_id?: string | null;
  customer_name: string;
  customer_phone: string;
  customer_email?: string | null;
  order_type: "product" | "service" | "mixed";
  status: OrderStatus;
  payment_status: OrderPaymentStatus;
  fulfilment_status: OrderFulfilmentStatus;
  currency: string;
  subtotal_amount: number;
  tax_amount: number;
  total_amount: number;
  notes?: string | null;
  payment_reference?: string | null;
  payment_verified_at?: string | null;
  cancellation_reason?: string | null;
  refund_amount?: number;
  metadata?: Record<string, any>;
  items?: TenantOrderItem[];
  created_at: string;
  updated_at: string;
}

export interface TenantCatalogueSettings {
  account_id: string;
  catalogue_name: string;
  is_public_catalogue_enabled: boolean;
  allow_out_of_stock_orders: boolean;
  require_payment_before_fulfilment: boolean;
  order_notification_whatsapp_enabled: boolean;
  order_confirmation_template: string;
  payment_instructions_template: string;
  status_update_template: string;
  completion_feedback_template: string;
  created_at: string;
  updated_at: string;
}

export interface ProductCsvRow {
  name: string;
  sku: string;
  item_type: "product" | "service";
  category?: string;
  price: number;
  currency?: string;
  tax_rate_percent?: number;
  stock_quantity?: number;
  track_inventory?: boolean;
  is_available?: boolean;
  description?: string;
  service_duration_minutes?: number;
  service_booking_requirements?: string;
}

export interface CsvImportResult {
  totalRows: number;
  validRows: ProductCsvRow[];
  errors: Array<{ row: number; sku?: string; error: string }>;
  duplicateSkus: string[];
}
