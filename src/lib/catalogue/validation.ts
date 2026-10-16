// ============================================================
// Catalogue & Order Validation Functions
// Enforces data integrity, price non-negativity, SKU rules,
// tax boundaries, and distinguishes physical items from services.
// ============================================================

import { ItemType, ProductVariant, TenantOrderItem } from "./types";

export class ValidationError extends Error {
  readonly status = 400 as const;
  readonly code = "VALIDATION_ERROR" as const;

  constructor(message: string, public readonly field?: string) {
    super(message);
    this.name = "ValidationError";
  }
}

export function sanitizeSku(rawSku: string): string {
  if (!rawSku || typeof rawSku !== "string") {
    throw new ValidationError("SKU is required", "sku");
  }
  const cleaned = rawSku.trim().toUpperCase();
  if (!/^[A-Z0-9_\-\.]{1,64}$/.test(cleaned)) {
    throw new ValidationError(
      "SKU must be 1-64 alphanumeric characters, dashes, underscores, or periods",
      "sku"
    );
  }
  return cleaned;
}

export function validateProductPayload(payload: any): {
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
  variants: ProductVariant[];
  service_duration_minutes?: number | null;
  service_booking_requirements?: string | null;
  service_terms?: string | null;
} {
  if (!payload || typeof payload !== "object") {
    throw new ValidationError("Invalid product payload");
  }

  const name = typeof payload.name === "string" ? payload.name.trim() : "";
  if (!name || name.length > 255) {
    throw new ValidationError("Product name is required (max 255 characters)", "name");
  }

  const sku = sanitizeSku(payload.sku);

  const price = Number(payload.price);
  if (isNaN(price) || price < 0) {
    throw new ValidationError("Price must be a non-negative number", "price");
  }

  const taxRate = payload.tax_rate_percent !== undefined ? Number(payload.tax_rate_percent) : 0;
  if (isNaN(taxRate) || taxRate < 0 || taxRate > 100) {
    throw new ValidationError("Tax rate must be between 0% and 100%", "tax_rate_percent");
  }

  const item_type: ItemType = payload.item_type === "service" ? "service" : "product";
  const currency = (payload.currency || "INR").trim().toUpperCase();
  const category = (payload.category || "General").trim();
  const description = payload.description ? String(payload.description).trim() : null;
  const images = Array.isArray(payload.images)
    ? payload.images.map(String).filter((img) => img.startsWith("http") || img.startsWith("/"))
    : [];

  const is_available = payload.is_available !== false;
  let track_inventory = item_type === "service" ? false : payload.track_inventory !== false;
  let stock_quantity = item_type === "service" ? 0 : Number(payload.stock_quantity || 0);

  if (item_type === "product" && track_inventory) {
    if (isNaN(stock_quantity) || stock_quantity < 0 || !Number.isInteger(stock_quantity)) {
      throw new ValidationError("Stock quantity must be a non-negative integer", "stock_quantity");
    }
  }

  // Variants validation
  const variants: ProductVariant[] = [];
  if (Array.isArray(payload.variants)) {
    const seenVariantSkus = new Set<string>();
    for (const v of payload.variants) {
      if (!v || typeof v !== "object") continue;
      const vName = String(v.name || "").trim();
      if (!vName) throw new ValidationError("Variant name is required", "variants");
      const vSku = sanitizeSku(v.sku || `${sku}-${vName}`);
      if (seenVariantSkus.has(vSku)) {
        throw new ValidationError(`Duplicate variant SKU '${vSku}' detected`, "variants");
      }
      seenVariantSkus.add(vSku);

      const vPrice = Number(v.price ?? price);
      if (isNaN(vPrice) || vPrice < 0) {
        throw new ValidationError(`Variant '${vName}' has invalid price`, "variants");
      }

      variants.push({
        id: v.id || `var_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        name: vName,
        sku: vSku,
        price: vPrice,
        stock_quantity: v.stock_quantity !== undefined ? Math.max(0, Math.floor(Number(v.stock_quantity))) : undefined,
        attributes: v.attributes && typeof v.attributes === "object" ? v.attributes : {},
      });
    }
  }

  // Service specific validation
  let service_duration_minutes: number | null = null;
  let service_booking_requirements: string | null = null;
  let service_terms: string | null = null;

  if (item_type === "service") {
    if (payload.service_duration_minutes !== undefined && payload.service_duration_minutes !== null) {
      const dur = Number(payload.service_duration_minutes);
      if (isNaN(dur) || dur <= 0 || !Number.isInteger(dur)) {
        throw new ValidationError("Service duration must be a positive integer in minutes", "service_duration_minutes");
      }
      service_duration_minutes = dur;
    }
    service_booking_requirements = payload.service_booking_requirements ? String(payload.service_booking_requirements).trim() : null;
    service_terms = payload.service_terms ? String(payload.service_terms).trim() : null;
  }

  return {
    name,
    sku,
    description,
    category,
    images,
    price,
    currency,
    tax_rate_percent: taxRate,
    item_type,
    stock_quantity,
    track_inventory,
    is_available,
    variants,
    service_duration_minutes,
    service_booking_requirements,
    service_terms,
  };
}

export function validateOrderPayload(payload: any): {
  customer_name: string;
  customer_phone: string;
  customer_email?: string | null;
  notes?: string | null;
  items: Array<{
    product_id: string | null;
    item_type: ItemType;
    item_name: string;
    sku?: string | null;
    variant_id?: string | null;
    unit_price: number;
    quantity: number;
    service_scheduled_at?: string | null;
  }>;
} {
  if (!payload || typeof payload !== "object") {
    throw new ValidationError("Invalid order payload");
  }

  const customer_name = typeof payload.customer_name === "string" ? payload.customer_name.trim() : "";
  if (!customer_name) {
    throw new ValidationError("Customer name is required", "customer_name");
  }

  const rawPhone = typeof payload.customer_phone === "string" ? payload.customer_phone.trim() : "";
  const cleanedPhone = rawPhone.replace(/[^\d+]/g, "");
  if (cleanedPhone.length < 7) {
    throw new ValidationError("Valid customer phone number is required (min 7 digits)", "customer_phone");
  }

  const customer_email = payload.customer_email ? String(payload.customer_email).trim() : null;
  const notes = payload.notes ? String(payload.notes).trim() : null;

  if (!Array.isArray(payload.items) || payload.items.length === 0) {
    throw new ValidationError("Order must contain at least one item", "items");
  }

  const items = payload.items.map((item: any, idx: number) => {
    if (!item || typeof item !== "object") {
      throw new ValidationError(`Item at index ${idx} is invalid`, `items[${idx}]`);
    }

    const item_name = typeof item.item_name === "string" ? item.item_name.trim() : "";
    if (!item_name) {
      throw new ValidationError(`Item name is required for item #${idx + 1}`, `items[${idx}].item_name`);
    }

    const unit_price = Number(item.unit_price);
    if (isNaN(unit_price) || unit_price < 0) {
      throw new ValidationError(`Unit price must be non-negative for item #${idx + 1}`, `items[${idx}].unit_price`);
    }

    const quantity = Number(item.quantity);
    if (isNaN(quantity) || quantity <= 0 || !Number.isInteger(quantity)) {
      throw new ValidationError(`Quantity must be a positive integer for item #${idx + 1}`, `items[${idx}].quantity`);
    }

    const item_type: ItemType = item.item_type === "service" ? "service" : "product";

    return {
      product_id: item.product_id ? String(item.product_id) : null,
      item_type,
      item_name,
      sku: item.sku ? String(item.sku).trim() : null,
      variant_id: item.variant_id ? String(item.variant_id) : null,
      unit_price,
      quantity,
      service_scheduled_at: item.service_scheduled_at ? new Date(item.service_scheduled_at).toISOString() : null,
    };
  });

  return {
    customer_name,
    customer_phone: cleanedPhone,
    customer_email,
    notes,
    items,
  };
}
