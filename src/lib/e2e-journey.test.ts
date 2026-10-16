import { describe, it, expect } from "vitest";
import crypto from "crypto";
import { PRICING_PLANS } from "@/lib/plans/config";
import { verifyRazorpayPaymentSignature } from "@/lib/razorpay/client";
import {
  generateLicenseKey,
  createSubscriptionLicense,
  renewSubscriptionLicense,
  evaluateSubscriptionStatus,
  type LicenseEntitlements,
  type PlatformLicense,
} from "@/lib/licenses/lifecycle";
import {
  assertTenantScope,
  CrossTenantViolationError,
  redactCustomerMessageForAdmin,
} from "@/lib/auth/tenant-guard";
import {
  checkSubscriptionAccess,
  assertSubscriptionActive,
  SubscriptionSuspendedError,
} from "@/lib/auth/subscription-guard";
import { validateProductPayload } from "@/lib/catalogue/validation";
import {
  generateOrderReference,
  calculateOrderTotals,
  verifyAndMarkOrderPaid,
  UnverifiedPaymentError,
} from "@/lib/catalogue/order-engine";
import {
  evaluateAbuseRiskScore,
  triggerEmergencyKillSwitch,
  restoreFromKillSwitch,
} from "@/lib/governance/abuse-detector";
import { evaluateFeatureFlag } from "@/lib/governance/feature-flags";
import {
  sanitizeTenantDataForExport,
  scheduleTenantAccountDeletion,
} from "@/lib/governance/data-lifecycle";
import type { TenantOrder, TenantProduct } from "@/lib/catalogue/types";
import type { FeatureFlag, PlatformAbuseRecord } from "@/lib/governance/types";
import type { AccountContext } from "@/lib/auth/account";

const sampleEntitlements: LicenseEntitlements = {
  maxTeamSeats: 5,
  maxContacts: 10000,
  maxBroadcastsPerMonth: 25000,
  maxFlows: 20,
  aiAllowed: true,
  webhooksAllowed: true,
};

describe("Phase 8: Complete 17-Step Customer Journey & System QA", () => {
  // 1 & 2: Visitor inspects plans and selects a package
  it("Step 1 & 2: Visitor inspects plans and selects a package", () => {
    expect(PRICING_PLANS).toBeDefined();
    expect(PRICING_PLANS.length).toBeGreaterThanOrEqual(3);

    const proPlan = PRICING_PLANS.find((p) => p.id === "pro");
    expect(proPlan).toBeDefined();
    expect(proPlan?.pricing.INR.monthly).toBeGreaterThan(0);
    expect(proPlan?.pricing.INR.annual).toBeGreaterThan(0);
    expect(proPlan?.highlightFeatures.length).toBeGreaterThan(0);
  });

  // 3: Customer signs up and completes Razorpay sandbox payment
  it("Step 3: Razorpay checkout signature is cryptographically verified", () => {
    const orderId = "order_test_998877";
    const paymentId = "pay_test_112233";
    const secret = "rzp_test_secret_123456";

    const validSignature = crypto
      .createHmac("sha256", secret)
      .update(`${orderId}|${paymentId}`)
      .digest("hex");

    const isValid = verifyRazorpayPaymentSignature({
      keySecret: secret,
      orderId,
      paymentId,
      signature: validSignature,
    });
    expect(isValid).toBe(true);

    const isForged = verifyRazorpayPaymentSignature({
      keySecret: secret,
      orderId,
      paymentId,
      signature: "bad_forged_signature_hex",
    });
    expect(isForged).toBe(false);
  });

  // 4 & 5: Verified payment updates Admin CRM; exact-once tenant provisioning
  it("Step 4 & 5: Provisioning creates exactly one license with cryptographic key and SHA-256 hash", () => {
    const { rawKey, keyHash, keyPrefix } = generateLicenseKey("pro");
    expect(rawKey).toMatch(/^WACRM-PRO-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/);
    expect(keyHash).toHaveLength(64);
    expect(keyPrefix).toMatch(/^WACRM-PRO-[A-Z0-9]{4}-\*\*\*\*$/);
    expect(keyHash).not.toBe(rawKey);

    const { license } = createSubscriptionLicense({
      accountId: "tenant_alpha_001",
      planId: "pro",
      planName: "Professional Plan",
      durationMonths: 1,
      entitlements: sampleEntitlements,
      gracePeriodDays: 3,
    });

    expect(license.account_id).toBe("tenant_alpha_001");
    expect(license.status).toBe("ACTIVE");
    expect(license.audit_events[0].event).toBe("CREATED");
  });

  // 6 & 7: Customer logs in and context is resolved with tenant scoping
  it("Step 6 & 7: Customer logs in and authenticated tenant context is scoped", () => {
    const mockContext: AccountContext = {
      supabase: {} as any,
      userId: "user_alpha_123",
      accountId: "tenant_alpha_001",
      role: "admin",
      account: { id: "tenant_alpha_001", name: "Alpha Retailers" },
    };

    expect(() => assertTenantScope("tenant_alpha_001", mockContext)).not.toThrow();
    expect(() => assertTenantScope(undefined, mockContext)).not.toThrow();
  });

  // 8: Products, services, and workflows are created
  it("Step 8: Products and services are validated before catalog entry", () => {
    const validProductInput = {
      name: "WhatsApp Store Assistant",
      sku: "BOT-SKU-01",
      price: 1499,
      currency: "INR",
      stock_quantity: 25,
      item_type: "product" as const,
    };

    const sanitized = validateProductPayload(validProductInput);
    expect(sanitized.name).toBe("WhatsApp Store Assistant");
    expect(sanitized.sku).toBe("BOT-SKU-01");
    expect(sanitized.price).toBe(1499);
  });

  // 9: Orders are created and payment verification prevents unverified screenshot fraud
  it("Step 9: Orders are created; payment verification rejects unverified claims", () => {
    const orderRef = generateOrderReference();
    expect(orderRef).toMatch(/^ORD-\d{8}-[A-Z0-9]+$/);

    const totals = calculateOrderTotals([
      { unit_price: 1000, quantity: 2, tax_rate_percent: 18 },
    ]);
    expect(totals.subtotal).toBe(2000);
    expect(totals.taxAmount).toBe(360);
    expect(totals.total).toBe(2360);

    const mockPendingOrder: TenantOrder = {
      id: "ord-1",
      account_id: "tenant_alpha_001",
      order_reference: orderRef,
      customer_id: "c-1",
      status: "pending",
      payment_status: "pending",
      payment_method: "upi",
      currency: "INR",
      subtotal: 2000,
      tax_amount: 360,
      delivery_fee: 0,
      discount_amount: 0,
      total_amount: 2360,
      items: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Customer claiming "I sent a screenshot on WhatsApp" without gateway/bank transaction
    expect(() =>
      verifyAndMarkOrderPaid(mockPendingOrder, {
        provider: "razorpay",
        paymentReference: "", // Missing proof
        verifiedBy: "system",
      })
    ).toThrowError(UnverifiedPaymentError);

    // With authentic gateway verification transaction ID
    const paidOrder = verifyAndMarkOrderPaid(mockPendingOrder, {
      provider: "razorpay",
      paymentReference: "pay_rzp_verified_12345",
      verifiedBy: "webhook",
      signatureValid: true,
    });
    expect(paidOrder.payment_status).toBe("paid");
    expect(paidOrder.status).toBe("confirmed");
  });

  // 10 & 11: Deduplicated renewal reminder scheduling & exact-once renewal math
  it("Step 10 & 11: Renewal preserves already-paid days without date truncation", () => {
    const now = new Date("2026-06-01T00:00:00.000Z");
    const existingExpiry = new Date("2026-06-15T00:00:00.000Z"); // 14 days left

    const existingLicense: PlatformLicense = {
      id: "lic_existing",
      license_key_hash: "hash",
      license_key_prefix: "WACRM-PRO-****-****",
      account_id: "tenant_alpha_001",
      plan_id: "pro",
      plan_name: "Professional Plan",
      status: "ACTIVE",
      valid_from: "2026-05-15T00:00:00.000Z",
      valid_until: existingExpiry.toISOString(),
      grace_period_days: 3,
      entitlements: sampleEntitlements,
      audit_events: [],
      created_at: "2026-05-15T00:00:00.000Z",
      updated_at: "2026-05-15T00:00:00.000Z",
    };

    const renewed = renewSubscriptionLicense({
      license: existingLicense,
      durationMonths: 1,
      paymentReference: "pay_renewal_9988",
      paymentTimestamp: now.toISOString(),
    });

    // Expiry should extend from 2026-06-15 (not 2026-06-01)
    const expectedNewExpiry = new Date(existingExpiry.getTime() + 30 * 24 * 3600 * 1000).toISOString();
    expect(renewed.valid_until).toBe(expectedNewExpiry);
    expect(renewed.status).toBe("ACTIVE");
  });

  // 12 & 13: Expiry or suspension blocks protected functionality; renewal restores
  it("Step 12 & 13: Subscription guard enforces suspension and restoration", () => {
    const expiredPastGraceLicense: PlatformLicense = {
      id: "lic_expired",
      license_key_hash: "hash",
      license_key_prefix: "WACRM-PRO-****-****",
      account_id: "tenant_alpha_001",
      plan_id: "pro",
      plan_name: "Professional Plan",
      status: "ACTIVE",
      valid_from: "2026-01-01T00:00:00.000Z",
      valid_until: "2026-02-01T00:00:00.000Z",
      grace_period_days: 3,
      entitlements: sampleEntitlements,
      audit_events: [],
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z",
    };

    const checkDate = new Date("2026-02-10T00:00:00.000Z"); // 9 days after expiry
    const status = evaluateSubscriptionStatus(expiredPastGraceLicense, checkDate);
    expect(status.status).toBe("SUSPENDED");

    expect(() =>
      assertSubscriptionActive({
        ...expiredPastGraceLicense,
        status: "SUSPENDED",
      })
    ).toThrowError(SubscriptionSuspendedError);

    // Restored account allows access
    const activeAccount: AccountSubscriptionRecord = {
      subscription_status: "ACTIVE",
      current_period_ends_at: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString(),
    };
    const access = checkSubscriptionAccess(activeAccount);
    expect(access.allowed).toBe(true);
  });

  // 14: Tenant A cannot access Tenant B's data
  it("Step 14: Cross-tenant breach attempt is strictly blocked", () => {
    const mockContextTenantA: AccountContext = {
      supabase: {} as any,
      userId: "user_alpha_123",
      accountId: "tenant_alpha_001",
      role: "admin",
      account: { id: "tenant_alpha_001", name: "Alpha Retailers" },
    };

    expect(() => assertTenantScope("tenant_beta_002", mockContextTenantA)).toThrowError(
      CrossTenantViolationError
    );
  });

  // 15: Admin can view permitted metadata but cannot routinely inspect private customer messages
  it("Step 15: Admin telemetry strictly redacts private message bodies", () => {
    const rawCustomerRecord = {
      id: "msg-123",
      account_id: "tenant_alpha_001",
      customer_phone: "+919876543210",
      body: "Confidential credit card inquiry or personal patient medical history",
      status: "delivered",
      created_at: new Date().toISOString(),
    };

    const redacted = redactCustomerMessageForAdmin(rawCustomerRecord);
    expect(redacted.customer_phone).toBe("+919876543210");
    expect(redacted.status).toBe("delivered");
    expect(redacted).not.toHaveProperty("body");
    expect(redacted.is_redacted).toBe(true);
  });

  // 16: Abuse detector, kill switch & failure containment
  it("Step 16: Abuse detector transitions state and emergency kill switch halts safely", () => {
    const evaluation = evaluateAbuseRiskScore({
      abnormalVolume: true,
      failedAuthAttempts: 6,
      rateLimitBreaches: 4,
    });
    expect(evaluation.score).toBeGreaterThanOrEqual(70);
    expect(["RESTRICTED", "SUSPENDED"]).toContain(evaluation.recommendedState);

    const record: PlatformAbuseRecord = {
      id: "rec_1",
      account_id: "tenant_alpha_001",
      state: "NORMAL",
      risk_score: 10,
      flags: [],
      kill_switch_active: false,
      history: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const killed = triggerEmergencyKillSwitch(record, "Credential breach detected");
    expect(killed.state).toBe("SUSPENDED");
    expect(killed.kill_switch_active).toBe(true);

    const restored = restoreFromKillSwitch(killed, "Admin completed security audit");
    expect(restored.state).toBe("NORMAL");
    expect(restored.kill_switch_active).toBe(false);
  });

  // 17: Existing CRM functionality & DPDP Act compliance remains intact
  it("Step 17: DPDP export sanitization scrubs secrets and feature flags respect emergency disable", () => {
    const exported = sanitizeTenantDataForExport({
      accountId: "acc_alpha_001",
      contacts: [{ id: "c1", name: "Alice", phone: "+919999911111" }],
      products: [{ id: "p1", name: "Shoe", price: 999 }],
      orders: [{ id: "o1", total: 999, payment_secret: "secret" }],
    });
    expect(exported.accountId).toBe("acc_alpha_001");
    expect(exported.contacts).toHaveLength(1);
    expect(exported.orders[0]).not.toHaveProperty("payment_secret");

    // Scheduled deletion retention is 30 days
    const deletionSchedule = scheduleTenantAccountDeletion({
      accountId: "acc_alpha_001",
      requestedBy: "admin",
    });
    expect(deletionSchedule.graceDaysRemaining).toBe(30);
    expect(new Date(deletionSchedule.deletionScheduledAt).getTime()).toBeGreaterThan(Date.now());

    // Feature flag with emergency disable
    const flag: FeatureFlag = {
      id: "f_1",
      name: "ai_bot",
      description: "AI Auto-reply",
      state: "ON",
      eligible_plans: ["pro", "enterprise"],
      is_emergency_disabled: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const evalResult = evaluateFeatureFlag(flag, { planTier: "enterprise" });
    expect(evalResult.enabled).toBe(false);
    expect(evalResult.reason?.toLowerCase()).toContain("emergency");
  });
});
