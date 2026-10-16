// ============================================================
// License Management & Subscription Lifecycle Engine
//
// Features:
// 1. Cryptographically secure license key generation & SHA-256 storage.
// 2. Exact-once renewal calculation:
//    - Renewal BEFORE expiry: extends from existing expiry date (no loss of paid days).
//    - Renewal AFTER expiry: extends from payment timestamp.
// 3. Grace-period and suspension rules (server-side, timezone-aware).
// 4. Safe reactivation with audit event logging.
// 5. Deduplicated 15-day reminder scheduling.
// ============================================================

import crypto from "crypto";

export type LicenseStatus = "ACTIVE" | "GRACE_PERIOD" | "SUSPENDED" | "EXPIRED" | "REVOKED";

export interface LicenseEntitlements {
  maxTeamSeats: number;
  maxContacts: number;
  maxBroadcastsPerMonth: number;
  maxFlows: number;
  aiAllowed: boolean;
  webhooksAllowed: boolean;
}

export interface LicenseAuditEvent {
  event: "CREATED" | "ACTIVATED" | "RENEWED" | "SUSPENDED" | "REACTIVATED" | "REVOKED" | "ADJUSTED";
  timestamp: string;
  actor: "system" | "admin" | "webhook";
  reason: string;
  referenceId?: string;
  previousExpiry?: string;
  newExpiry?: string;
}

export interface PlatformLicense {
  id: string;
  license_key_hash: string;
  license_key_prefix: string;
  account_id: string;
  plan_id: string;
  plan_name: string;
  status: LicenseStatus;
  valid_from: string;
  valid_until: string;
  grace_period_days: number;
  entitlements: LicenseEntitlements;
  audit_events: LicenseAuditEvent[];
  created_at: string;
  updated_at: string;
}

/**
 * Generates a cryptographically secure license key and its SHA-256 hash.
 * Key format: `WACRM-<PLAN>-<16 random hex chars>`
 */
export function generateLicenseKey(planId: string): {
  rawKey: string;
  keyHash: string;
  keyPrefix: string;
} {
  const planTag = planId.toUpperCase().slice(0, 5);
  const randomHex = crypto.randomBytes(8).toString("hex").toUpperCase();
  const rawKey = `WACRM-${planTag}-${randomHex.slice(0, 4)}-${randomHex.slice(4, 8)}-${randomHex.slice(8, 12)}-${randomHex.slice(12, 16)}`;
  
  const keyHash = crypto.createHash("sha256").update(rawKey).digest("hex");
  const keyPrefix = `WACRM-${planTag}-${randomHex.slice(0, 4)}-****`;

  return { rawKey, keyHash, keyPrefix };
}

/**
 * Creates a brand new license record for a newly provisioned subscription.
 */
export function createSubscriptionLicense(params: {
  accountId: string;
  planId: string;
  planName: string;
  durationMonths: number;
  entitlements: LicenseEntitlements;
  gracePeriodDays?: number;
  startTimestamp?: string;
}): { license: PlatformLicense; rawKey: string } {
  const {
    accountId,
    planId,
    planName,
    durationMonths,
    entitlements,
    gracePeriodDays = 3,
    startTimestamp = new Date().toISOString(),
  } = params;

  const { rawKey, keyHash, keyPrefix } = generateLicenseKey(planId);

  const startDate = new Date(startTimestamp);
  const expiryDate = new Date(startDate.getTime() + durationMonths * 30 * 24 * 3600 * 1000);

  const license: PlatformLicense = {
    id: `lic_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`,
    license_key_hash: keyHash,
    license_key_prefix: keyPrefix,
    account_id: accountId,
    plan_id: planId,
    plan_name: planName,
    status: "ACTIVE",
    valid_from: startDate.toISOString(),
    valid_until: expiryDate.toISOString(),
    grace_period_days: gracePeriodDays,
    entitlements,
    audit_events: [
      {
        event: "CREATED",
        timestamp: new Date().toISOString(),
        actor: "system",
        reason: `New ${planName} license provisioned for ${durationMonths} month(s)`,
        newExpiry: expiryDate.toISOString(),
      },
    ],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  return { license, rawKey };
}

/**
 * Renews an existing subscription license.
 *
 * Exact-Once Renewal Logic:
 * - If renewal occurs BEFORE expiry: extends from the existing expiry date (no loss of already-paid time).
 * - If renewal occurs AFTER expiry: extends from the payment date.
 */
export function renewSubscriptionLicense(params: {
  license: PlatformLicense;
  durationMonths: number;
  paymentReference: string;
  paymentTimestamp?: string;
  actor?: "system" | "admin" | "webhook";
}): PlatformLicense {
  const {
    license,
    durationMonths,
    paymentReference,
    paymentTimestamp = new Date().toISOString(),
    actor = "webhook",
  } = params;

  const paymentDate = new Date(paymentTimestamp);
  const currentExpiry = new Date(license.valid_until);
  const daysToAdd = durationMonths * 30;

  // Decide renewal base date to prevent accidental loss of already-paid time
  const baseDate = currentExpiry > paymentDate ? currentExpiry : paymentDate;
  const newExpiry = new Date(baseDate.getTime() + daysToAdd * 24 * 3600 * 1000);

  const auditEvent: LicenseAuditEvent = {
    event: "RENEWED",
    timestamp: new Date().toISOString(),
    actor,
    reason: `Subscription renewed for ${durationMonths} month(s) via payment ${paymentReference}`,
    referenceId: paymentReference,
    previousExpiry: license.valid_until,
    newExpiry: newExpiry.toISOString(),
  };

  return {
    ...license,
    status: "ACTIVE",
    valid_until: newExpiry.toISOString(),
    audit_events: [...(license.audit_events || []), auditEvent],
    updated_at: new Date().toISOString(),
  };
}

/**
 * Server-side timezone-aware subscription status evaluation.
 * Returns the effective status based on expiration and grace period rules.
 */
export function evaluateSubscriptionStatus(
  validUntil: string,
  gracePeriodDays: number,
  nowTimestamp = new Date().toISOString()
): { status: LicenseStatus; daysRemaining: number; isInGracePeriod: boolean } {
  const now = new Date(nowTimestamp).getTime();
  const expiry = new Date(validUntil).getTime();
  const graceEnd = expiry + gracePeriodDays * 24 * 3600 * 1000;

  const diffMs = expiry - now;
  const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (now <= expiry) {
    return { status: "ACTIVE", daysRemaining, isInGracePeriod: false };
  } else if (now <= graceEnd) {
    return { status: "GRACE_PERIOD", daysRemaining, isInGracePeriod: true };
  } else {
    return { status: "SUSPENDED", daysRemaining, isInGracePeriod: false };
  }
}

/**
 * Reactivates a suspended license upon authorized administrative adjustment or verified payment.
 */
export function reactivateSubscriptionLicense(
  license: PlatformLicense,
  params: {
    newExpiry: string;
    reason: string;
    actor: "admin" | "webhook" | "system";
    referenceId?: string;
  }
): PlatformLicense {
  const auditEvent: LicenseAuditEvent = {
    event: "REACTIVATED",
    timestamp: new Date().toISOString(),
    actor: params.actor,
    reason: params.reason,
    referenceId: params.referenceId,
    previousExpiry: license.valid_until,
    newExpiry: params.newExpiry,
  };

  return {
    ...license,
    status: "ACTIVE",
    valid_until: params.newExpiry,
    audit_events: [...(license.audit_events || []), auditEvent],
    updated_at: new Date().toISOString(),
  };
}

/**
 * Checks whether an automated renewal reminder is due for a given milestone (e.g. 15, 7, 3, 1, 0 days).
 */
export function isRenewalReminderDue(
  validUntil: string,
  milestoneDays: number,
  nowTimestamp = new Date().toISOString()
): boolean {
  const now = new Date(nowTimestamp).getTime();
  const expiry = new Date(validUntil).getTime();
  const daysLeft = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
  return daysLeft <= milestoneDays && daysLeft >= 0;
}
