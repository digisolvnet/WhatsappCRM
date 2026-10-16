import { describe, it, expect } from "vitest";
import {
  evaluateAbuseRiskScore,
  triggerEmergencyKillSwitch,
  restoreFromKillSwitch,
} from "./abuse-detector";
import { evaluateFeatureFlag } from "./feature-flags";
import {
  sanitizeTenantDataForExport,
  scheduleTenantAccountDeletion,
} from "./data-lifecycle";
import { listInternalTeamPolicies, getInternalTeamPolicy } from "./team-policies";
import type { FeatureFlag, PlatformAbuseRecord } from "./types";

describe("Phase 7: SaaS Policies, Risk Controls, Compliance & Governance", () => {
  describe("Abuse Detection & Risk Controls Engine", () => {
    it("evaluates healthy signals as NORMAL state", () => {
      const evaluation = evaluateAbuseRiskScore({
        abnormalVolume: false,
        failedAuthAttempts: 1,
        rateLimitBreaches: 0,
      });

      expect(evaluation.score).toBeLessThan(20);
      expect(evaluation.recommendedState).toBe("NORMAL");
      expect(evaluation.flags).toHaveLength(0);
    });

    it("evaluates multiple warnings and elevates state to REVIEW_REQUIRED or RESTRICTED", () => {
      const evaluation = evaluateAbuseRiskScore({
        abnormalVolume: true, // +25
        failedAuthAttempts: 5, // +25
        rateLimitBreaches: 3, // +20
      });

      expect(evaluation.score).toBe(70);
      expect(evaluation.recommendedState).toBe("RESTRICTED");
      expect(evaluation.flags).toContain("abnormal_message_volume");
      expect(evaluation.flags).toContain("repeated_failed_auth");
      expect(evaluation.flags).toContain("rate_limit_breached");
    });

    it("evaluates WhatsApp provider policy warning and payment disputes to SUSPENDED", () => {
      const evaluation = evaluateAbuseRiskScore({
        whatsappWarnings: 2, // +35
        paymentDisputes: 2, // +40
        abnormalVolume: true, // +25
      });

      expect(evaluation.score).toBe(100); // capped at 100
      expect(evaluation.recommendedState).toBe("SUSPENDED");
      expect(evaluation.flags).toContain("whatsapp_provider_warning");
      expect(evaluation.flags).toContain("payment_chargeback_dispute");
    });

    it("activates emergency kill switch immediately", () => {
      const initialRecord: PlatformAbuseRecord = {
        id: "rec_1",
        account_id: "tenant_alpha",
        state: "NORMAL",
        risk_score: 10,
        flags: [],
        evidence_summary: null,
        kill_switch_active: false,
        last_reviewed_at: null,
        reviewed_by: null,
        review_notes: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const killed = triggerEmergencyKillSwitch(initialRecord, {
        reason: "Compromised API secret token detected",
        actor: "Super Admin",
      });

      expect(killed.state).toBe("SUSPENDED");
      expect(killed.kill_switch_active).toBe(true);
      expect(killed.risk_score).toBe(100);
      expect(killed.flags).toContain("emergency_kill_switch_active");
      expect(killed.review_notes).toContain("EMERGENCY KILL SWITCH ACTIVATED");
    });

    it("restores account from kill switch following administrative verification", () => {
      const killedRecord: PlatformAbuseRecord = {
        id: "rec_1",
        account_id: "tenant_alpha",
        state: "SUSPENDED",
        risk_score: 100,
        flags: ["emergency_kill_switch_active"],
        evidence_summary: null,
        kill_switch_active: true,
        last_reviewed_at: new Date().toISOString(),
        reviewed_by: "Super Admin",
        review_notes: "Killed",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const restored = restoreFromKillSwitch(killedRecord, {
        notes: "Token rotated and verified clean",
        actor: "Super Admin",
      });

      expect(restored.state).toBe("NORMAL");
      expect(restored.kill_switch_active).toBe(false);
      expect(restored.risk_score).toBe(0);
      expect(restored.flags).not.toContain("emergency_kill_switch_active");
    });
  });

  describe("Feature Flags & Plan Entitlements", () => {
    const sampleFlag: FeatureFlag = {
      flag_key: "ai_bot",
      name: "AI Autonomous Agent",
      state: "ON",
      eligible_plans: ["pro", "enterprise"],
      rollout_percentage: 100,
      is_emergency_disabled: false,
    };

    it("enables feature for eligible Pro and Enterprise plans", () => {
      const evalPro = evaluateFeatureFlag(sampleFlag, { planTier: "pro" });
      expect(evalPro.enabled).toBe(true);

      const evalEnt = evaluateFeatureFlag(sampleFlag, { planTier: "enterprise" });
      expect(evalEnt.enabled).toBe(true);
    });

    it("blocks feature for ineligible Starter plan", () => {
      const evalStarter = evaluateFeatureFlag(sampleFlag, { planTier: "starter" });
      expect(evalStarter.enabled).toBe(false);
      expect(evalStarter.reason).toContain("requires an upgraded plan");
    });

    it("emergency disable overrides all other rules and disables feature globally", () => {
      const emergencyDisabledFlag: FeatureFlag = {
        ...sampleFlag,
        is_emergency_disabled: true,
      };

      const result = evaluateFeatureFlag(emergencyDisabledFlag, { planTier: "enterprise" });
      expect(result.enabled).toBe(false);
      expect(result.reason).toContain("emergency disabled");
    });

    it("correctly flags SOON state as coming soon", () => {
      const soonFlag: FeatureFlag = {
        ...sampleFlag,
        state: "SOON",
      };

      const result = evaluateFeatureFlag(soonFlag, { planTier: "pro" });
      expect(result.enabled).toBe(false);
      expect(result.isComingSoon).toBe(true);
    });

    it("respects SCHEDULED release timestamps", () => {
      const scheduledFlag: FeatureFlag = {
        ...sampleFlag,
        state: "SCHEDULED",
        scheduled_release_at: "2026-12-01T00:00:00.000Z",
      };

      // Before scheduled date
      const before = evaluateFeatureFlag(scheduledFlag, {
        planTier: "pro",
        now: new Date("2026-11-15T00:00:00.000Z"),
      });
      expect(before.enabled).toBe(false);

      // After scheduled date
      const after = evaluateFeatureFlag(scheduledFlag, {
        planTier: "pro",
        now: new Date("2026-12-05T00:00:00.000Z"),
      });
      expect(after.enabled).toBe(true);
    });
  });

  describe("Tenant Data Lifecycle & Indian DPDP Act 2023 Compliance", () => {
    it("sanitizes tenant export manifest and scrubs sensitive secrets", () => {
      const rawContacts = [{ id: "c1", name: "Rahul", phone: "+919876543210", internal_notes: "VIP" }];
      const rawProducts = [{ id: "p1", name: "Guide", price: 500 }];
      const rawOrders = [{ id: "o1", order_reference: "ORD-1", total_amount: 590, payment_secret: "secret_rzp" }];

      const manifest = sanitizeTenantDataForExport({
        accountId: "tenant_alpha",
        contacts: rawContacts,
        products: rawProducts,
        orders: rawOrders,
      });

      expect(manifest.accountId).toBe("tenant_alpha");
      expect(manifest.contactsCount).toBe(1);
      expect(manifest.ordersCount).toBe(1);
      expect(manifest.redactedFields).toContain("passwords");
      expect(manifest.redactedFields).toContain("razorpay_key_secrets");

      // Verify secrets were scrubbed
      expect(manifest.orders[0]).not.toHaveProperty("payment_secret");
      expect(manifest.contacts[0]).not.toHaveProperty("internal_notes");
    });

    it("schedules account deletion with statutory 30-day grace retention window", () => {
      const now = new Date("2026-05-01T00:00:00.000Z");
      const schedule = scheduleTenantAccountDeletion({
        accountId: "tenant_alpha",
        requestedBy: "user_owner",
        now,
      });

      expect(schedule.graceDaysRemaining).toBe(30);
      const expectedDate = new Date("2026-05-31T00:00:00.000Z").toISOString();
      expect(schedule.deletionScheduledAt).toBe(expectedDate);
      expect(schedule.policyNotice).toContain("30 days");
      expect(schedule.policyNotice).toContain("Indian GST");
    });
  });

  describe("Internal Team Governance & Future HR Policies", () => {
    it("provides all 10 future-ready internal team policies", () => {
      const policies = listInternalTeamPolicies();
      expect(policies).toHaveLength(10);

      const requiredPolicySlugs = [
        "leave_and_attendance",
        "working_hours_and_holidays",
        "confidentiality_and_access",
        "onboarding_offboarding",
        "password_and_device_security",
        "customer_data_handling",
        "incident_escalation_and_disciplinary",
        "code_review_and_release",
        "vendor_and_third_party_access",
        "backup_and_business_continuity",
      ];

      for (const slug of requiredPolicySlugs) {
        const policy = getInternalTeamPolicy(slug);
        expect(policy, `Policy '${slug}' must exist`).toBeDefined();
        expect(policy?.guidance.length).toBeGreaterThan(1);
        expect(policy?.disclaimer).toBeDefined();
      }
    });

    it("enforces zero message snooping in customer data handling policy", () => {
      const dataPolicy = getInternalTeamPolicy("customer_data_handling");
      expect(dataPolicy).toBeDefined();
      const combinedGuidance = dataPolicy!.guidance.join(" ");
      expect(combinedGuidance).toContain("Zero Snooping");
      expect(combinedGuidance).toContain("WhatsApp");
    });
  });
});
