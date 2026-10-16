import { describe, it, expect } from "vitest";
import { listFlowTemplates, getFlowTemplate } from "./templates";
import { validateFlowForActivation } from "./validate";
import {
  assertTenantAutomationPermitted,
  checkTenantRateLimit,
  checkTenantExecutionQuota,
  assertNoExecutionLoop,
  calculateRetryBackoffMs,
  generateStepIdempotencyKey,
  isWithin24HourCustomerWindow,
  assertWhatsAppMessageCompliance,
  simulateFlowExecution,
  LoopDetectedError,
  QuotaExceededError,
  RateLimitExceededError,
  WhatsAppPolicyViolationError,
} from "./execution-guard";
import { SubscriptionSuspendedError } from "@/lib/auth/subscription-guard";
import { assertTenantScope, CrossTenantViolationError } from "@/lib/auth/tenant-guard";

describe("Phase 6: WhatsApp Automation & Flow Builder", () => {
  describe("The 12 Tenant-Configurable Flow Templates Validation", () => {
    const requiredSlugs = [
      "incoming_message",
      "welcome_menu",
      "catalogue_browsing",
      "order_builder",
      "consent_and_details",
      "checkout_verification",
      "order_confirmation",
      "order_tracking",
      "support_escalation",
      "post_purchase_feedback",
      "repeat_purchase",
      "subscription_notice",
    ];

    it("registers all 12 required workflow templates", () => {
      const templates = listFlowTemplates();
      expect(templates.length).toBeGreaterThanOrEqual(12);

      for (const slug of requiredSlugs) {
        const tpl = getFlowTemplate(slug);
        expect(tpl, `Template '${slug}' must be registered`).toBeDefined();
        expect(tpl?.name).toBeDefined();
        expect(tpl?.entry_node_id).toBe("start");
      }
    });

    it("ensures every template passes save-time validation with ZERO errors", () => {
      for (const slug of requiredSlugs) {
        const tpl = getFlowTemplate(slug)!;
        const issues = validateFlowForActivation(
          {
            name: tpl.name,
            trigger_type: tpl.trigger_type,
            trigger_config: tpl.trigger_config,
            entry_node_id: tpl.entry_node_id,
          },
          tpl.nodes.map((n) => ({
            node_key: n.node_key,
            node_type: n.node_type,
            config: n.config,
          }))
        );

        const errors = issues.filter((i) => i.severity === "error");
        expect(
          errors,
          `Template '${slug}' has validation errors: ${errors.map((e) => e.message).join(", ")}`
        ).toEqual([]);
      }
    });
  });

  describe("Suspended-Account & Entitlement Guards", () => {
    it("allows automation execution for active tenant", () => {
      const activeAccount = {
        id: "acc_active",
        subscription_status: "active",
        current_period_ends_at: "2026-12-31T00:00:00.000Z",
      };

      expect(() =>
        assertTenantAutomationPermitted(activeAccount, "2026-06-01T00:00:00.000Z")
      ).not.toThrow();
    });

    it("blocks automation execution when tenant is suspended past grace period", () => {
      const suspendedAccount = {
        id: "acc_suspended",
        subscription_status: "suspended",
        current_period_ends_at: "2026-01-01T00:00:00.000Z",
        grace_period_days: 3,
      };

      expect(() =>
        assertTenantAutomationPermitted(suspendedAccount, "2026-01-10T00:00:00.000Z")
      ).toThrow(SubscriptionSuspendedError);
    });

    it("blocks automation execution when monthly quota is exceeded", () => {
      expect(() => checkTenantExecutionQuota(1000, 1000)).toThrow(QuotaExceededError);
      expect(() => checkTenantExecutionQuota(500, 1000)).not.toThrow();
    });

    it("blocks automation bursts exceeding rate limits per minute", () => {
      const tenantId = `tenant_rate_test_${Date.now()}`;
      // Allow 5 executions
      for (let i = 0; i < 5; i++) {
        expect(() => checkTenantRateLimit(tenantId, 5)).not.toThrow();
      }
      // 6th execution in the same minute should throw
      expect(() => checkTenantRateLimit(tenantId, 5)).toThrow(RateLimitExceededError);
    });
  });

  describe("Loop Prevention & Execution Safety", () => {
    it("terminates when step transitions exceed maximum threshold", () => {
      const runawayPath = Array.from({ length: 51 }, (_, i) => `node_${i}`);
      expect(() => assertNoExecutionLoop(runawayPath, 50)).toThrow(LoopDetectedError);
    });

    it("detects and terminates immediate cyclic loops (A -> B -> A -> B -> A -> B)", () => {
      const cyclicPath = ["start", "nodeA", "nodeB", "nodeA", "nodeB", "nodeA", "nodeB"];
      expect(() => assertNoExecutionLoop(cyclicPath)).toThrow(LoopDetectedError);
    });
  });

  describe("Failure Retry & Idempotency", () => {
    it("calculates exponential backoff for retries", () => {
      const backoff0 = calculateRetryBackoffMs(0, 1000);
      const backoff2 = calculateRetryBackoffMs(2, 1000);

      expect(backoff0).toBeGreaterThanOrEqual(1000);
      expect(backoff2).toBeGreaterThanOrEqual(4000);
      expect(backoff2).toBeGreaterThan(backoff0);
    });

    it("generates deterministic step idempotency key to prevent duplicate sends on retry", () => {
      const key1 = generateStepIdempotencyKey("run_123", "send_welcome", 0);
      const key2 = generateStepIdempotencyKey("run_123", "send_welcome", 0);
      const keyAttempt1 = generateStepIdempotencyKey("run_123", "send_welcome", 1);

      expect(key1).toBe("step_run_123_send_welcome_att0");
      expect(key1).toBe(key2);
      expect(key1).not.toBe(keyAttempt1);
    });
  });

  describe("WhatsApp Policies & 24h Customer Service Window", () => {
    it("permits freeform interactive messages within 24h of inbound message", () => {
      const recentInbound = new Date(Date.now() - 2 * 3600 * 1000).toISOString(); // 2 hours ago
      expect(isWithin24HourCustomerWindow(recentInbound)).toBe(true);

      expect(() =>
        assertWhatsAppMessageCompliance({
          messageType: "interactive",
          lastInboundTimestamp: recentInbound,
        })
      ).not.toThrow();
    });

    it("rejects freeform interactive messages outside 24h window (requires approved template)", () => {
      const staleInbound = new Date(Date.now() - 26 * 3600 * 1000).toISOString(); // 26 hours ago
      expect(isWithin24HourCustomerWindow(staleInbound)).toBe(false);

      expect(() =>
        assertWhatsAppMessageCompliance({
          messageType: "freeform",
          lastInboundTimestamp: staleInbound,
        })
      ).toThrow(WhatsAppPolicyViolationError);

      // Pre-approved template is always allowed even outside 24h window
      expect(() =>
        assertWhatsAppMessageCompliance({
          messageType: "template",
          lastInboundTimestamp: staleInbound,
        })
      ).not.toThrow();
    });

    it("strictly blocks messaging opted-out contacts", () => {
      expect(() =>
        assertWhatsAppMessageCompliance({
          isOptedOut: true,
          messageType: "template",
        })
      ).toThrow(WhatsAppPolicyViolationError);
    });
  });

  describe("Safe Test Mode (Dry-Run Simulation)", () => {
    it("simulates flow execution graph without external side-effects", () => {
      const tpl = getFlowTemplate("order_builder")!;
      const simulation = simulateFlowExecution(
        { entry_node_id: tpl.entry_node_id },
        tpl.nodes.map((n) => ({
          node_key: n.node_key,
          node_type: n.node_type,
          config: n.config,
        }))
      );

      expect(simulation.success).toBe(true);
      expect(simulation.steps.length).toBeGreaterThan(1);
      expect(simulation.steps[0].nodeKey).toBe("start");
      expect(simulation.finalVars).toHaveProperty("order_qty");
    });
  });

  describe("Multi-Tenant Isolation", () => {
    it("ensures flow execution requests are strictly scoped to caller tenant", () => {
      const tenantContext = { accountId: "tenant_alpha", role: "admin" as const, userId: "user_a" };

      expect(() => assertTenantScope("tenant_alpha", tenantContext as any)).not.toThrow();
      expect(() => assertTenantScope("tenant_beta", tenantContext as any)).toThrow(
        CrossTenantViolationError
      );
    });
  });
});
