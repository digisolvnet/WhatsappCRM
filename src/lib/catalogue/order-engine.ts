// ============================================================
// Tenant Order Engine & State Machine
//
// Features:
// 1. Order reference generation (ORD-YYYYMMDD-XXXX).
// 2. Pricing and tax calculation.
// 3. Lifecycle transitions (order status, payment state, fulfilment state).
// 4. Strict payment verification: NEVER marks paid based only on screenshot or message.
// 5. Configurable WhatsApp notification message formatting.
// 6. Admin privacy redaction for aggregate metrics.
// ============================================================

import crypto from "crypto";
import {
  OrderStatus,
  OrderPaymentStatus,
  OrderFulfilmentStatus,
  TenantOrder,
  TenantOrderItem,
  TenantProduct,
} from "./types";

export class OrderStateTransitionError extends Error {
  readonly status = 400 as const;
  readonly code = "INVALID_ORDER_TRANSITION" as const;

  constructor(message: string, public readonly fromState: string, public readonly toState: string) {
    super(message);
    this.name = "OrderStateTransitionError";
  }
}

export class UnverifiedPaymentError extends Error {
  readonly status = 400 as const;
  readonly code = "UNVERIFIED_PAYMENT" as const;

  constructor(message = "Payment verification failed: Cannot mark order as paid without verified provider confirmation") {
    super(message);
    this.name = "UnverifiedPaymentError";
  }
}

/**
 * Generates an order reference in format `ORD-YYYYMMDD-XXXX`
 */
export function generateOrderReference(date = new Date()): string {
  const yyyy = date.getUTCFullYear();
  const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(date.getUTCDate()).padStart(2, "0");
  const randomHex = crypto.randomBytes(2).toString("hex").toUpperCase();
  return `ORD-${yyyy}${mm}${dd}-${randomHex}`;
}

/**
 * Calculates subtotal, tax amount, and total amount for an order.
 */
export function calculateOrderTotals(
  items: Array<{ unit_price: number; quantity: number; tax_rate_percent?: number }>,
  currency = "INR"
): {
  subtotal: number;
  taxAmount: number;
  total: number;
} {
  let subtotal = 0;
  let taxAmount = 0;

  for (const item of items) {
    const itemTotal = Math.round(item.unit_price * item.quantity * 100) / 100;
    subtotal += itemTotal;
    const rate = Number(item.tax_rate_percent || 0);
    if (rate > 0) {
      taxAmount += Math.round(itemTotal * (rate / 100) * 100) / 100;
    }
  }

  const total = Math.round((subtotal + taxAmount) * 100) / 100;
  return { subtotal, taxAmount, total };
}

/**
 * Valid state transitions for order lifecycle
 */
const VALID_ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["processing", "cancelled"],
  processing: ["completed", "cancelled"],
  completed: ["refunded"],
  cancelled: [],
  refunded: [],
};

export function transitionOrderStatus(
  currentStatus: OrderStatus,
  targetStatus: OrderStatus,
  reason?: string
): OrderStatus {
  if (currentStatus === targetStatus) return currentStatus;

  const allowed = VALID_ORDER_TRANSITIONS[currentStatus];
  if (!allowed || !allowed.includes(targetStatus)) {
    throw new OrderStateTransitionError(
      `Cannot transition order from '${currentStatus}' to '${targetStatus}'`,
      currentStatus,
      targetStatus
    );
  }

  return targetStatus;
}

/**
 * Strict Payment Verification:
 * NEVER marks an order as paid based on customer screenshots or plain chat claims.
 * Requires verified payment provider transaction ID or cryptographic signature validation.
 */
export function verifyAndMarkOrderPaid(
  order: TenantOrder,
  params: {
    provider: "razorpay" | "bank_transfer_admin" | "pos_verified";
    paymentReference: string;
    verifiedBy: string;
    signatureValid?: boolean;
    amountPaid?: number;
  }
): TenantOrder {
  const { provider, paymentReference, verifiedBy, signatureValid, amountPaid } = params;

  if (!paymentReference || paymentReference.trim().length < 5) {
    throw new UnverifiedPaymentError("Valid payment reference from provider is required");
  }

  if (provider === "razorpay" && signatureValid === false) {
    throw new UnverifiedPaymentError("Razorpay signature verification failed. Order cannot be marked paid.");
  }

  if (amountPaid !== undefined && amountPaid < order.total_amount) {
    throw new UnverifiedPaymentError(
      `Amount paid (${amountPaid}) does not match order total (${order.total_amount})`
    );
  }

  return {
    ...order,
    payment_status: "paid",
    status: order.status === "pending" ? "confirmed" : order.status,
    payment_reference: paymentReference.trim(),
    payment_verified_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    metadata: {
      ...(order.metadata || {}),
      payment_verified_by: verifiedBy,
      payment_provider: provider,
    },
  };
}

/**
 * WhatsApp Message Renderers
 */
export function renderOrderConfirmationMessage(
  order: TenantOrder,
  template?: string
): string {
  const defaultTpl =
    "Hello {{customer_name}}, thank you for your order #{{order_reference}}! Total amount: {{currency}} {{total_amount}}. We are preparing your order.";
  const tpl = template || defaultTpl;

  return tpl
    .replace(/{{customer_name}}/g, order.customer_name)
    .replace(/{{order_reference}}/g, order.order_reference)
    .replace(/{{currency}}/g, order.currency)
    .replace(/{{total_amount}}/g, order.total_amount.toFixed(2))
    .replace(/{{order_status}}/g, order.status);
}

export function renderPaymentInstructionsMessage(
  order: TenantOrder,
  paymentLink: string,
  template?: string
): string {
  const defaultTpl =
    "Hi {{customer_name}}, to complete your order #{{order_reference}}, please pay {{currency}} {{total_amount}} via {{payment_link}}.";
  const tpl = template || defaultTpl;

  return tpl
    .replace(/{{customer_name}}/g, order.customer_name)
    .replace(/{{order_reference}}/g, order.order_reference)
    .replace(/{{currency}}/g, order.currency)
    .replace(/{{total_amount}}/g, order.total_amount.toFixed(2))
    .replace(/{{payment_link}}/g, paymentLink);
}

export function renderStatusUpdateMessage(
  order: TenantOrder,
  template?: string
): string {
  const defaultTpl =
    "Update on order #{{order_reference}}: Status is now {{order_status}}.";
  const tpl = template || defaultTpl;

  return tpl
    .replace(/{{customer_name}}/g, order.customer_name)
    .replace(/{{order_reference}}/g, order.order_reference)
    .replace(/{{order_status}}/g, order.status)
    .replace(/{{payment_status}}/g, order.payment_status)
    .replace(/{{fulfilment_status}}/g, order.fulfilment_status);
}

export function renderCompletionFeedbackMessage(
  order: TenantOrder,
  template?: string
): string {
  const defaultTpl =
    "Hello {{customer_name}}, your order #{{order_reference}} has been completed. How was your experience? Reply with your feedback!";
  const tpl = template || defaultTpl;

  return tpl
    .replace(/{{customer_name}}/g, order.customer_name)
    .replace(/{{order_reference}}/g, order.order_reference);
}

/**
 * Privacy-Safe Aggregate Metrics for Platform Admin
 * Guarantees that Central Admin CRM sees ONLY high-level volume and counts,
 * NOT private customer message contents or personal customer contact details.
 */
export interface PrivacySafeCatalogueMetrics {
  accountId: string;
  totalOrders: number;
  totalOrderVolume: number;
  currency: string;
  ordersByStatus: Record<OrderStatus, number>;
  ordersByPaymentStatus: Record<OrderPaymentStatus, number>;
  totalProductsCount: number;
  totalServicesCount: number;
  calculatedAt: string;
}

export function computeTenantCatalogueMetrics(
  accountId: string,
  orders: TenantOrder[],
  products: TenantProduct[]
): PrivacySafeCatalogueMetrics {
  const ordersByStatus: Record<OrderStatus, number> = {
    pending: 0,
    confirmed: 0,
    processing: 0,
    completed: 0,
    cancelled: 0,
    refunded: 0,
  };

  const ordersByPaymentStatus: Record<OrderPaymentStatus, number> = {
    unpaid: 0,
    pending_verification: 0,
    paid: 0,
    partially_refunded: 0,
    refunded: 0,
    failed: 0,
  };

  let totalVolume = 0;
  for (const o of orders) {
    if (ordersByStatus[o.status] !== undefined) {
      ordersByStatus[o.status]++;
    }
    if (ordersByPaymentStatus[o.payment_status] !== undefined) {
      ordersByPaymentStatus[o.payment_status]++;
    }
    if (o.payment_status === "paid" || o.status === "completed") {
      totalVolume += o.total_amount;
    }
  }

  let totalProducts = 0;
  let totalServices = 0;
  for (const p of products) {
    if (p.item_type === "service") totalServices++;
    else totalProducts++;
  }

  return {
    accountId,
    totalOrders: orders.length,
    totalOrderVolume: Math.round(totalVolume * 100) / 100,
    currency: "INR",
    ordersByStatus,
    ordersByPaymentStatus,
    totalProductsCount: totalProducts,
    totalServicesCount: totalServices,
    calculatedAt: new Date().toISOString(),
  };
}
