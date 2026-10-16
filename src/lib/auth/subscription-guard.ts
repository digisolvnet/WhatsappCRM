// ============================================================
// Server-Side Subscription & License Suspension Guard
//
// Blocks paid operational actions (broadcasts, automations, outbound messages)
// when a tenant's subscription/license is in SUSPENDED or EXPIRED status.
//
// CRITICAL:
// - Read-only access (dashboards, contacts, chat history) is PRESERVED.
// - Billing & renewal access (/checkout, /pricing, payment webhooks) is ALWAYS ALLOWED.
// - Grace period allows continued operation with warning telemetry.
// ============================================================

import { evaluateSubscriptionStatus, type LicenseStatus } from "@/lib/licenses/lifecycle";

export type RestrictedOperation = 
  | "broadcast" 
  | "automation" 
  | "outbound_message" 
  | "template_dispatch" 
  | "ai_agent"
  | "contact_export";

export interface AccountSubscriptionRecord {
  id?: string;
  subscription_status?: string | null;
  current_period_ends_at?: string | null;
  grace_period_days?: number | null;
  plan_tier?: string | null;
  is_super_admin?: boolean | null;
  role?: string | null;
}

export class SubscriptionSuspendedError extends Error {
  readonly status = 403 as const;
  readonly code = "SUBSCRIPTION_SUSPENDED" as const;
  readonly renewalUrl = "/pricing";

  constructor(
    message = "Operation forbidden: Subscription is suspended or expired. Please renew your plan to restore full messaging capabilities.",
    public readonly accountId?: string,
    public readonly currentStatus?: LicenseStatus | string,
    public readonly daysOverdue?: number
  ) {
    super(message);
    this.name = "SubscriptionSuspendedError";
  }
}

export interface SubscriptionEvaluationResult {
  allowed: boolean;
  effectiveStatus: LicenseStatus;
  isInGracePeriod: boolean;
  daysRemaining: number;
  reason?: string;
}

/**
 * Checks subscription status for an account and determines if paid operational capabilities
 * are permissible.
 */
export function checkSubscriptionAccess(
  account: AccountSubscriptionRecord | null | undefined,
  nowTimestamp?: string
): SubscriptionEvaluationResult {
  // Super Admin bypass: Admin accounts never require a subscription status
  if (
    account?.is_super_admin === true ||
    account?.role === "super_admin" ||
    (account?.plan_tier && account.plan_tier.toLowerCase().includes("admin")) ||
    account?.subscription_status === "exempt" ||
    account?.subscription_status === "unlimited"
  ) {
    return {
      allowed: true,
      effectiveStatus: "ACTIVE",
      isInGracePeriod: false,
      daysRemaining: 999999,
      reason: "Super Admin: Subscription status not required (Perpetual Unrestricted Access)",
    };
  }

  if (!account) {
    // If no account is loaded or during public setup
    return {
      allowed: false,
      effectiveStatus: "SUSPENDED",
      isInGracePeriod: false,
      daysRemaining: 0,
      reason: "Account or subscription not found",
    };
  }

  // If explicit status is already suspended or revoked
  const explicitStatus = (account.subscription_status || "").toUpperCase();
  if (explicitStatus === "SUSPENDED" || explicitStatus === "REVOKED") {
    return {
      allowed: false,
      effectiveStatus: explicitStatus as LicenseStatus,
      isInGracePeriod: false,
      daysRemaining: 0,
      reason: `Account subscription is explicitly marked as ${explicitStatus}`,
    };
  }

  // If current_period_ends_at is set, evaluate via date and grace period
  if (account.current_period_ends_at) {
    const graceDays = account.grace_period_days ?? 3;
    const evaluation = evaluateSubscriptionStatus(
      account.current_period_ends_at,
      graceDays,
      nowTimestamp
    );

    if (evaluation.status === "SUSPENDED" || evaluation.status === "EXPIRED") {
      return {
        allowed: false,
        effectiveStatus: evaluation.status,
        isInGracePeriod: false,
        daysRemaining: evaluation.daysRemaining,
        reason: `Subscription expired on ${account.current_period_ends_at} and grace period of ${graceDays} days elapsed`,
      };
    }

    if (evaluation.status === "GRACE_PERIOD") {
      return {
        allowed: true, // Grace period allows operation with warning
        effectiveStatus: "GRACE_PERIOD",
        isInGracePeriod: true,
        daysRemaining: evaluation.daysRemaining,
        reason: "Subscription is in grace period. Immediate renewal advised.",
      };
    }

    return {
      allowed: true,
      effectiveStatus: "ACTIVE",
      isInGracePeriod: false,
      daysRemaining: evaluation.daysRemaining,
    };
  }

  // Fallback for accounts with active or trial string status
  if (explicitStatus === "ACTIVE" || explicitStatus === "TRIAL") {
    return {
      allowed: true,
      effectiveStatus: "ACTIVE",
      isInGracePeriod: false,
      daysRemaining: 30,
    };
  }

  return {
    allowed: false,
    effectiveStatus: "SUSPENDED",
    isInGracePeriod: false,
    daysRemaining: 0,
    reason: `Subscription status '${account.subscription_status}' is not eligible for paid operations`,
  };
}

/**
 * Asserts that an account has an active or in-grace subscription before executing
 * a restricted operational task.
 *
 * Throws `SubscriptionSuspendedError` if the subscription is suspended or expired.
 */
export function assertSubscriptionActive(
  account: AccountSubscriptionRecord | null | undefined,
  operation: RestrictedOperation = "outbound_message",
  nowTimestamp?: string
): void {
  const check = checkSubscriptionAccess(account, nowTimestamp);
  if (!check.allowed) {
    throw new SubscriptionSuspendedError(
      `Cannot execute '${operation}': Subscription is currently ${check.effectiveStatus}. Please renew to resume operations.`,
      account?.id,
      check.effectiveStatus,
      Math.abs(check.daysRemaining)
    );
  }
}
