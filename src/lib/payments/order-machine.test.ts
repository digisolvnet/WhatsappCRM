import { describe, it, expect, vi } from "vitest";
import {
  transitionOrderState,
  executeTenantProvisioning,
  InvalidStateTransitionError,
  type PlatformOrder,
} from "./order-machine";
import {
  verifyRazorpayPaymentSignature,
  verifyRazorpayWebhookSignature,
} from "@/lib/razorpay/client";

describe("Phase 3: Order State Machine, Payment Verification & Idempotency", () => {
  const sampleOrder: PlatformOrder = {
    id: "ord-test-001",
    razorpay_order_id: "order_mock_12345",
    razorpay_payment_id: null,
    account_id: null,
    customer_email: "client@example.com",
    customer_name: "Client Business",
    plan_id: "pro",
    plan_name: "Professional",
    billing_cycle: "annual",
    duration_months: 12,
    amount: 23988,
    currency: "INR",
    status: "PENDING_PAYMENT",
    provisioning_status: "not_started",
    verification_state: "unverified",
    state_history: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const keySecret = "live_secret_key_testing_123";

  describe("1. State Machine Transitions", () => {
    it("successfully follows the lifecycle: PENDING_PAYMENT -> PAID -> ACTIVE", () => {
      // 1. Transition to PAID
      const paidOrder = transitionOrderState(sampleOrder, "PAID", {
        reason: "Payment verified by HMAC signature",
        actor: "server_verify",
        referenceId: "pay_test_999",
      });

      expect(paidOrder.status).toBe("PAID");
      expect(paidOrder.provisioning_status).toBe("in_progress");
      expect(paidOrder.state_history).toHaveLength(1);
      expect(paidOrder.state_history[0].to).toBe("PAID");

      // 2. Execute provisioning -> ACTIVE
      const { updatedOrder, result } = executeTenantProvisioning(paidOrder);
      expect(updatedOrder.status).toBe("ACTIVE");
      expect(updatedOrder.provisioning_status).toBe("completed");
      expect(result.success).toBe(true);
      expect(result.alreadyProvisioned).toBe(false);
      expect(updatedOrder.account_id).toBeDefined();
    });

    it("strictly rejects illegal transitions (e.g. FAILED -> ACTIVE without payment)", () => {
      const failedOrder: PlatformOrder = {
        ...sampleOrder,
        status: "FAILED",
        provisioning_status: "failed",
      };

      expect(() =>
        transitionOrderState(failedOrder, "ACTIVE", {
          reason: "Attacker tried to force active",
          actor: "system",
        })
      ).toThrowError(InvalidStateTransitionError);
    });

    it("strictly rejects provisioning an order that is still in PENDING_PAYMENT", () => {
      expect(() => executeTenantProvisioning(sampleOrder)).toThrow(
        "Cannot provision order in status 'PENDING_PAYMENT'. Payment must be verified first."
      );
    });
  });

  describe("2. Idempotent Provisioning & Duplicate Callbacks", () => {
    it("never provisions duplicate accounts when receiving duplicate payment callbacks", () => {
      const paidOrder = transitionOrderState(sampleOrder, "PAID", {
        reason: "First callback",
        actor: "webhook",
        referenceId: "pay_dup_001",
      });

      // First run: provisions account
      const firstRun = executeTenantProvisioning(paidOrder);
      const provisionedAccountId = firstRun.result.accountId;
      expect(firstRun.result.alreadyProvisioned).toBe(false);

      // Second duplicate callback for same order: must be idempotent no-op
      const secondRun = executeTenantProvisioning(firstRun.updatedOrder, {
        id: provisionedAccountId,
        subscription_status: "active",
      });

      expect(secondRun.result.success).toBe(true);
      expect(secondRun.result.alreadyProvisioned).toBe(true);
      expect(secondRun.result.accountId).toBe(provisionedAccountId);
      expect(secondRun.updatedOrder.account_id).toBe(provisionedAccountId);
    });
  });

  describe("3. Payment Verification & Forged Callback Prevention", () => {
    it("verifies genuine Razorpay signature correctly", () => {
      const orderId = "order_test_real_456";
      const paymentId = "pay_test_real_789";

      // Compute genuine HMAC SHA256 signature
      const crypto = require("crypto");
      const expectedSignature = crypto
        .createHmac("sha256", keySecret)
        .update(`${orderId}|${paymentId}`)
        .digest("hex");

      const isValid = verifyRazorpayPaymentSignature({
        keySecret,
        orderId,
        paymentId,
        signature: expectedSignature,
      });

      expect(isValid).toBe(true);
    });

    it("STRICTLY REJECTS forged or tampered signatures", () => {
      const orderId = "order_test_real_456";
      const paymentId = "pay_test_real_789";
      const forgedSignature = "0000000000000000000000000000000000000000000000000000000000000000";

      const isValid = verifyRazorpayPaymentSignature({
        keySecret,
        orderId,
        paymentId,
        signature: forgedSignature,
      });

      expect(isValid).toBe(false);
    });

    it("verifies genuine Razorpay webhook payload signature", () => {
      const crypto = require("crypto");
      const rawPayload = JSON.stringify({ event: "order.paid", id: "evt_123" });
      const webhookSecret = "secret_webhook_whsec_999";

      const expectedWebhookSig = crypto
        .createHmac("sha256", webhookSecret)
        .update(rawPayload)
        .digest("hex");

      const isValid = verifyRazorpayWebhookSignature({
        webhookSecret,
        rawPayload,
        signature: expectedWebhookSig,
      });

      expect(isValid).toBe(true);
    });

    it("STRICTLY REJECTS tampered webhook payload signature", () => {
      const rawPayload = JSON.stringify({ event: "order.paid", id: "evt_123" });
      const webhookSecret = "secret_webhook_whsec_999";
      const forgedSig = "tampered_signature_hex";

      const isValid = verifyRazorpayWebhookSignature({
        webhookSecret,
        rawPayload,
        signature: forgedSig,
      });

      expect(isValid).toBe(false);
    });
  });

  describe("4. Delayed and Out-of-Order Webhook Reconciliations", () => {
    it("handles delayed webhook arriving after order was initialized", () => {
      // Order was initialized in PENDING_PAYMENT
      expect(sampleOrder.status).toBe("PENDING_PAYMENT");

      // Delayed webhook arrives with payment.captured
      const orderAfterDelayedWebhook = transitionOrderState(sampleOrder, "PAID", {
        reason: "Delayed webhook delivery: payment.captured",
        actor: "webhook",
        referenceId: "pay_delayed_111",
      });

      const { updatedOrder } = executeTenantProvisioning(orderAfterDelayedWebhook);

      expect(updatedOrder.status).toBe("ACTIVE");
      expect(updatedOrder.provisioning_status).toBe("completed");
    });

    it("handles payment.failed event by transitioning order to FAILED", () => {
      const failedOrder = transitionOrderState(sampleOrder, "FAILED", {
        reason: "Card expired / bank payment declined",
        actor: "webhook",
        referenceId: "pay_failed_000",
      });

      expect(failedOrder.status).toBe("FAILED");
      expect(failedOrder.provisioning_status).toBe("failed");
    });
  });
});
