import { describe, it, expect } from "vitest";
import {
  generateLicenseKey,
  createSubscriptionLicense,
  renewSubscriptionLicense,
  evaluateSubscriptionStatus,
  reactivateSubscriptionLicense,
  isRenewalReminderDue,
  type LicenseEntitlements,
  type PlatformLicense,
} from "./lifecycle";
import {
  checkSubscriptionAccess,
  assertSubscriptionActive,
  SubscriptionSuspendedError,
} from "@/lib/auth/subscription-guard";

const sampleEntitlements: LicenseEntitlements = {
  maxTeamSeats: 5,
  maxContacts: 10000,
  maxBroadcastsPerMonth: 25000,
  maxFlows: 20,
  aiAllowed: true,
  webhooksAllowed: true,
};

describe("Phase 4: License Lifecycle & Subscription Automation", () => {
  describe("Cryptographic License Key Generation", () => {
    it("generates formatted license key, sha256 hash, and masked prefix", () => {
      const { rawKey, keyHash, keyPrefix } = generateLicenseKey("pro");

      expect(rawKey).toMatch(/^WACRM-PRO-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/);
      expect(keyHash).toHaveLength(64); // SHA-256 hex string
      expect(keyPrefix).toMatch(/^WACRM-PRO-[A-Z0-9]{4}-\*\*\*\*$/);
      // Ensure raw key is never the same as hash
      expect(keyHash).not.toBe(rawKey);
    });

    it("creates an active license record with audit event", () => {
      const now = new Date("2026-01-01T00:00:00.000Z");
      const { license, rawKey } = createSubscriptionLicense({
        accountId: "acc_tenant_1",
        planId: "pro",
        planName: "Professional Plan",
        durationMonths: 1,
        entitlements: sampleEntitlements,
        gracePeriodDays: 3,
        startTimestamp: now.toISOString(),
      });

      expect(license.account_id).toBe("acc_tenant_1");
      expect(license.plan_id).toBe("pro");
      expect(license.status).toBe("ACTIVE");
      expect(license.valid_from).toBe(now.toISOString());
      
      const expectedExpiry = new Date(now.getTime() + 30 * 24 * 3600 * 1000).toISOString();
      expect(license.valid_until).toBe(expectedExpiry);
      expect(license.grace_period_days).toBe(3);
      expect(license.audit_events).toHaveLength(1);
      expect(license.audit_events[0].event).toBe("CREATED");
      expect(license.audit_events[0].actor).toBe("system");
    });
  });

  describe("Exact-Once Renewal Rules", () => {
    it("extends from existing expiry date when renewal happens BEFORE expiry (preserves paid time)", () => {
      // Existing license expiring on Day 30
      const startDate = new Date("2026-01-01T00:00:00.000Z");
      const { license } = createSubscriptionLicense({
        accountId: "acc_tenant_1",
        planId: "pro",
        planName: "Professional Plan",
        durationMonths: 1,
        entitlements: sampleEntitlements,
        startTimestamp: startDate.toISOString(),
      });

      const initialExpiry = new Date(license.valid_until);

      // Customer renews 10 days before expiry (on Day 20)
      const earlyPaymentDate = new Date("2026-01-20T00:00:00.000Z");
      const renewed = renewSubscriptionLicense({
        license,
        durationMonths: 1,
        paymentReference: "pay_early_123",
        paymentTimestamp: earlyPaymentDate.toISOString(),
      });

      // New expiry must be initialExpiry + 30 days (Day 60), NOT earlyPaymentDate + 30 days (Day 50)
      const expectedNewExpiry = new Date(initialExpiry.getTime() + 30 * 24 * 3600 * 1000).toISOString();
      expect(renewed.valid_until).toBe(expectedNewExpiry);
      expect(renewed.status).toBe("ACTIVE");

      const latestAudit = renewed.audit_events[renewed.audit_events.length - 1];
      expect(latestAudit.event).toBe("RENEWED");
      expect(latestAudit.referenceId).toBe("pay_early_123");
      expect(latestAudit.previousExpiry).toBe(initialExpiry.toISOString());
      expect(latestAudit.newExpiry).toBe(expectedNewExpiry);
    });

    it("extends from payment date when renewal happens AFTER expiry", () => {
      const startDate = new Date("2026-01-01T00:00:00.000Z");
      const { license } = createSubscriptionLicense({
        accountId: "acc_tenant_1",
        planId: "starter",
        planName: "Starter Plan",
        durationMonths: 1,
        entitlements: sampleEntitlements,
        startTimestamp: startDate.toISOString(),
      });

      // Customer renews 5 days AFTER expiration
      const latePaymentDate = new Date("2026-02-05T00:00:00.000Z");
      const renewed = renewSubscriptionLicense({
        license,
        durationMonths: 1,
        paymentReference: "pay_late_456",
        paymentTimestamp: latePaymentDate.toISOString(),
      });

      // Extends from payment date + 30 days
      const expectedNewExpiry = new Date(latePaymentDate.getTime() + 30 * 24 * 3600 * 1000).toISOString();
      expect(renewed.valid_until).toBe(expectedNewExpiry);
      expect(renewed.status).toBe("ACTIVE");
    });
  });

  describe("Subscription Status & Grace Period Evaluation", () => {
    const validUntil = "2026-03-01T00:00:00.000Z";
    const graceDays = 3;

    it("evaluates status as ACTIVE before expiration", () => {
      const now = "2026-02-15T00:00:00.000Z";
      const evalResult = evaluateSubscriptionStatus(validUntil, graceDays, now);

      expect(evalResult.status).toBe("ACTIVE");
      expect(evalResult.isInGracePeriod).toBe(false);
      expect(evalResult.daysRemaining).toBe(14);
    });

    it("evaluates status as GRACE_PERIOD within 3 days after expiration", () => {
      // 1 day after expiration
      const now = "2026-03-02T00:00:00.000Z";
      const evalResult = evaluateSubscriptionStatus(validUntil, graceDays, now);

      expect(evalResult.status).toBe("GRACE_PERIOD");
      expect(evalResult.isInGracePeriod).toBe(true);
      expect(evalResult.daysRemaining).toBe(-1);
    });

    it("evaluates status as SUSPENDED when past grace period", () => {
      // 5 days after expiration (grace period is 3 days)
      const now = "2026-03-06T00:00:00.000Z";
      const evalResult = evaluateSubscriptionStatus(validUntil, graceDays, now);

      expect(evalResult.status).toBe("SUSPENDED");
      expect(evalResult.isInGracePeriod).toBe(false);
      expect(evalResult.daysRemaining).toBe(-5);
    });

    it("safely reactivates a suspended license with administrative audit event", () => {
      const { license } = createSubscriptionLicense({
        accountId: "acc_suspended",
        planId: "enterprise",
        planName: "Enterprise Plan",
        durationMonths: 1,
        entitlements: sampleEntitlements,
      });

      license.status = "SUSPENDED";
      const newExpiry = "2026-12-31T23:59:59.000Z";

      const reactivated = reactivateSubscriptionLicense(license, {
        newExpiry,
        reason: "Administrative manual override approved by Super Admin",
        actor: "admin",
        referenceId: "admin_req_999",
      });

      expect(reactivated.status).toBe("ACTIVE");
      expect(reactivated.valid_until).toBe(newExpiry);
      const audit = reactivated.audit_events[reactivated.audit_events.length - 1];
      expect(audit.event).toBe("REACTIVATED");
      expect(audit.actor).toBe("admin");
      expect(audit.referenceId).toBe("admin_req_999");
    });
  });

  describe("Server-Side Subscription Suspension Guard", () => {
    it("allows operations when account has active subscription", () => {
      const activeAccount = {
        id: "acc_1",
        subscription_status: "active",
        current_period_ends_at: "2026-12-31T00:00:00.000Z",
        grace_period_days: 3,
      };

      const access = checkSubscriptionAccess(activeAccount, "2026-06-01T00:00:00.000Z");
      expect(access.allowed).toBe(true);
      expect(access.effectiveStatus).toBe("ACTIVE");

      expect(() => {
        assertSubscriptionActive(activeAccount, "broadcast", "2026-06-01T00:00:00.000Z");
      }).not.toThrow();
    });

    it("allows operational access during grace period with warning flag", () => {
      const graceAccount = {
        id: "acc_grace",
        subscription_status: "past_due",
        current_period_ends_at: "2026-06-01T00:00:00.000Z",
        grace_period_days: 3,
      };

      // 1 day past expiry -> still in grace period
      const access = checkSubscriptionAccess(graceAccount, "2026-06-02T00:00:00.000Z");
      expect(access.allowed).toBe(true);
      expect(access.isInGracePeriod).toBe(true);
      expect(access.effectiveStatus).toBe("GRACE_PERIOD");

      expect(() => {
        assertSubscriptionActive(graceAccount, "outbound_message", "2026-06-02T00:00:00.000Z");
      }).not.toThrow();
    });

    it("throws SubscriptionSuspendedError when account is suspended past grace period", () => {
      const suspendedAccount = {
        id: "acc_expired",
        subscription_status: "suspended",
        current_period_ends_at: "2026-06-01T00:00:00.000Z",
        grace_period_days: 3,
      };

      // 10 days past expiry
      const access = checkSubscriptionAccess(suspendedAccount, "2026-06-11T00:00:00.000Z");
      expect(access.allowed).toBe(false);
      expect(access.effectiveStatus).toBe("SUSPENDED");

      expect(() => {
        assertSubscriptionActive(suspendedAccount, "broadcast", "2026-06-11T00:00:00.000Z");
      }).toThrowError(SubscriptionSuspendedError);
    });

    it("throws SubscriptionSuspendedError when account record is missing", () => {
      expect(() => {
        assertSubscriptionActive(null, "automation");
      }).toThrowError(SubscriptionSuspendedError);
    });
  });

  describe("Renewal Reminder Milestones (15, 7, 3, 1, 0 days)", () => {
    const expiry = "2026-04-15T00:00:00.000Z";

    it("triggers 15-day milestone accurately", () => {
      // 15 days before expiry
      const now15 = "2026-03-31T00:00:00.000Z";
      expect(isRenewalReminderDue(expiry, 15, now15)).toBe(true);

      // 20 days before expiry should NOT trigger 15-day milestone
      const now20 = "2026-03-26T00:00:00.000Z";
      expect(isRenewalReminderDue(expiry, 15, now20)).toBe(false);
    });

    it("does not trigger reminders for already-expired dates (negative days remaining)", () => {
      const pastExpiry = "2026-04-20T00:00:00.000Z";
      expect(isRenewalReminderDue(expiry, 15, pastExpiry)).toBe(false);
      expect(isRenewalReminderDue(expiry, 3, pastExpiry)).toBe(false);
    });
  });
});
