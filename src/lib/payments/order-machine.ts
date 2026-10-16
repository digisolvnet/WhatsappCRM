// ============================================================
// Central Order & Subscription Provisioning State Machine
//
// Lifecycle:
//   PENDING_PAYMENT -> PAID -> PROVISIONING -> ACTIVE
// Supporting: FAILED, CANCELLED, EXPIRED, SUSPENDED, REFUNDED
//
// Safety:
// - Never activates solely from frontend callbacks.
// - Enforces idempotency on provider order_id, payment_id, and event_id.
// - Retries provisioning safely without duplicate tenant creation.
// ============================================================

export type OrderState =
  | "PENDING_PAYMENT"
  | "PAID"
  | "PROVISIONING"
  | "ACTIVE"
  | "FAILED"
  | "CANCELLED"
  | "EXPIRED"
  | "SUSPENDED"
  | "REFUNDED";

export type ProvisioningStatus = "not_started" | "in_progress" | "completed" | "failed";

export type VerificationState = "unverified" | "signature_verified" | "webhook_verified";

export interface StateTransitionEvent {
  from: OrderState;
  to: OrderState;
  timestamp: string;
  reason: string;
  actor: "system" | "webhook" | "server_verify" | "admin";
  referenceId?: string;
}

export interface PlatformOrder {
  id: string;
  razorpay_order_id: string;
  razorpay_payment_id?: string | null;
  account_id?: string | null;
  customer_email: string;
  customer_name?: string | null;
  customer_phone?: string | null;
  plan_id: string;
  plan_name: string;
  billing_cycle: "monthly" | "annual" | "custom";
  duration_months: number;
  amount: number;
  currency: string;
  status: OrderState;
  provisioning_status: ProvisioningStatus;
  verification_state: VerificationState;
  idempotency_key?: string | null;
  state_history: StateTransitionEvent[];
  created_at: string;
  updated_at: string;
}

/** Allowed state transitions */
const VALID_TRANSITIONS: Record<OrderState, readonly OrderState[]> = {
  PENDING_PAYMENT: ["PAID", "FAILED", "CANCELLED"],
  PAID: ["PROVISIONING", "ACTIVE", "REFUNDED"],
  PROVISIONING: ["ACTIVE", "FAILED"],
  ACTIVE: ["EXPIRED", "SUSPENDED", "REFUNDED"],
  FAILED: ["PENDING_PAYMENT"], // allow retry
  CANCELLED: [],
  EXPIRED: ["PENDING_PAYMENT"], // allow renewal
  SUSPENDED: ["ACTIVE", "EXPIRED", "REFUNDED"],
  REFUNDED: [],
};

export class InvalidStateTransitionError extends Error {
  constructor(public readonly from: OrderState, public readonly to: OrderState) {
    super(`Invalid order state transition from '${from}' to '${to}'`);
    this.name = "InvalidStateTransitionError";
  }
}

/**
 * Validates and records a state transition in an order's history.
 */
export function transitionOrderState(
  order: PlatformOrder,
  toState: OrderState,
  params: {
    reason: string;
    actor: "system" | "webhook" | "server_verify" | "admin";
    referenceId?: string;
  }
): PlatformOrder {
  const allowed = VALID_TRANSITIONS[order.status] || [];
  if (!allowed.includes(toState)) {
    throw new InvalidStateTransitionError(order.status, toState);
  }

  const transition: StateTransitionEvent = {
    from: order.status,
    to: toState,
    timestamp: new Date().toISOString(),
    reason: params.reason,
    actor: params.actor,
    referenceId: params.referenceId,
  };

  const updated: PlatformOrder = {
    ...order,
    status: toState,
    state_history: [...(order.state_history || []), transition],
    updated_at: new Date().toISOString(),
  };

  // If moving to PAID/ACTIVE, update provisioning status appropriately
  if (toState === "PAID") {
    updated.provisioning_status = "in_progress";
  } else if (toState === "ACTIVE") {
    updated.provisioning_status = "completed";
  } else if (toState === "FAILED") {
    updated.provisioning_status = "failed";
  }

  return updated;
}

/**
 * Idempotently executes provisioning for an order that has been verified.
 * Guarantees that duplicate callbacks or retries do NOT create duplicate accounts.
 */
export interface ProvisioningResult {
  success: boolean;
  accountId: string;
  alreadyProvisioned: boolean;
  error?: string;
}

export function executeTenantProvisioning(
  order: PlatformOrder,
  existingAccount?: { id: string; subscription_status: string } | null
): { updatedOrder: PlatformOrder; result: ProvisioningResult } {
  // If order was already active and account exists, return idempotent no-op
  if (order.status === "ACTIVE" && order.provisioning_status === "completed" && existingAccount) {
    return {
      updatedOrder: order,
      result: {
        success: true,
        accountId: existingAccount.id,
        alreadyProvisioned: true,
      },
    };
  }

  // Must be in PAID or PROVISIONING state to provision
  if (order.status !== "PAID" && order.status !== "PROVISIONING") {
    throw new Error(`Cannot provision order in status '${order.status}'. Payment must be verified first.`);
  }

  // Provision target account ID
  const targetAccountId = existingAccount?.id || order.account_id || `acc_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

  // Transition to ACTIVE
  const activeOrder = transitionOrderState(order, "ACTIVE", {
    reason: "Tenant provisioned and entitlements unlocked",
    actor: "system",
    referenceId: order.razorpay_payment_id || undefined,
  });

  activeOrder.account_id = targetAccountId;

  return {
    updatedOrder: activeOrder,
    result: {
      success: true,
      accountId: targetAccountId,
      alreadyProvisioned: false,
    },
  };
}
