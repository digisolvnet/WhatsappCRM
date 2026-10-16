// ============================================================
// Stock Consistency & Inventory Engine
// Manages stock reservation, validation, and restoration.
// Bypasses inventory completely for service items.
// ============================================================

import { TenantOrderItem, TenantProduct } from "./types";

export class InsufficientStockError extends Error {
  readonly status = 400 as const;
  readonly code = "INSUFFICIENT_STOCK" as const;

  constructor(
    message: string,
    public readonly productName: string,
    public readonly sku: string,
    public readonly requestedQuantity: number,
    public readonly availableQuantity: number
  ) {
    super(message);
    this.name = "InsufficientStockError";
  }
}

/**
 * Validates stock availability for an order item against a product.
 * Throws InsufficientStockError if out-of-stock and allowOutOfStock is false.
 */
export function checkItemStock(
  product: TenantProduct,
  requestedQuantity: number,
  allowOutOfStock = false
): void {
  // Service items do not track physical inventory
  if (product.item_type === "service" || !product.track_inventory) {
    return;
  }

  if (product.stock_quantity < requestedQuantity && !allowOutOfStock) {
    throw new InsufficientStockError(
      `Insufficient stock for '${product.name}' (SKU: ${product.sku}). Requested: ${requestedQuantity}, Available: ${product.stock_quantity}`,
      product.name,
      product.sku,
      requestedQuantity,
      product.stock_quantity
    );
  }
}

/**
 * Deducts stock from a product when an order item is fulfilled or reserved.
 */
export function deductProductStock(
  product: TenantProduct,
  quantityToDeduct: number,
  allowOutOfStock = false
): TenantProduct {
  if (product.item_type === "service" || !product.track_inventory) {
    return product;
  }

  checkItemStock(product, quantityToDeduct, allowOutOfStock);

  return {
    ...product,
    stock_quantity: Math.max(0, product.stock_quantity - quantityToDeduct),
    updated_at: new Date().toISOString(),
  };
}

/**
 * Restores product inventory when an order or line item is cancelled or refunded.
 */
export function restoreProductStock(
  product: TenantProduct,
  quantityToRestore: number
): TenantProduct {
  if (product.item_type === "service" || !product.track_inventory) {
    return product;
  }

  return {
    ...product,
    stock_quantity: product.stock_quantity + quantityToRestore,
    updated_at: new Date().toISOString(),
  };
}
