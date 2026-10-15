import { describe, it, expect, vi, beforeEach } from "vitest";
import crypto from "crypto";
import {
  createRazorpayPaymentLink,
  createRazorpayOrder,
  verifyRazorpayPaymentSignature,
  verifyRazorpayWebhookSignature,
} from "./client";

describe("Razorpay Client Utilities", () => {
  const secretKey = "test_rzp_secret_12345";

  describe("verifyRazorpayPaymentSignature", () => {
    it("should correctly verify a valid payment signature using SHA256 HMAC", () => {
      const orderId = "order_9A33XWu170gUtm";
      const paymentId = "pay_29AeQIvtHdOFjd";
      const expectedSignature = crypto
        .createHmac("sha256", secretKey)
        .update(`${orderId}|${paymentId}`)
        .digest("hex");

      const isValid = verifyRazorpayPaymentSignature({
        keySecret: secretKey,
        orderId,
        paymentId,
        signature: expectedSignature,
      });

      expect(isValid).toBe(true);
    });

    it("should reject an invalid payment signature", () => {
      const isValid = verifyRazorpayPaymentSignature({
        keySecret: secretKey,
        orderId: "order_123",
        paymentId: "pay_456",
        signature: "invalid_tampered_signature_hex",
      });

      expect(isValid).toBe(false);
    });

    it("should accept demo signatures in demo mode", () => {
      process.env.NEXT_PUBLIC_DEMO_MODE = "true";
      const isValid = verifyRazorpayPaymentSignature({
        keySecret: secretKey,
        orderId: "order_demo",
        paymentId: "pay_demo",
        signature: "demo_sig_approved",
      });

      expect(isValid).toBe(true);
    });
  });

  describe("verifyRazorpayWebhookSignature", () => {
    it("should correctly verify a valid webhook signature", () => {
      const webhookSecret = "whsec_test_secret_999";
      const payload = JSON.stringify({ event: "payment_link.paid", payload: { id: 123 } });
      const expectedSignature = crypto
        .createHmac("sha256", webhookSecret)
        .update(payload)
        .digest("hex");

      const isValid = verifyRazorpayWebhookSignature({
        webhookSecret,
        rawPayload: payload,
        signature: expectedSignature,
      });

      expect(isValid).toBe(true);
    });

    it("should reject a tampered webhook payload signature", () => {
      const webhookSecret = "whsec_test_secret_999";
      const payload = JSON.stringify({ event: "order.paid" });

      const isValid = verifyRazorpayWebhookSignature({
        webhookSecret,
        rawPayload: payload,
        signature: "bad_signature_hex",
      });

      expect(isValid).toBe(false);
    });
  });

  describe("createRazorpayPaymentLink in Demo Mode", () => {
    it("should generate a simulated payment link when demo mode is active", async () => {
      process.env.NEXT_PUBLIC_DEMO_MODE = "true";
      const result = await createRazorpayPaymentLink({
        keyId: "rzp_test_mock",
        keySecret: "mock_secret",
        amount: 499,
        currency: "INR",
        description: "Test Consultation Fee",
      });

      expect(result.id).toMatch(/^plink_/);
      expect(result.short_url).toMatch(/^https:\/\/rzp\.io\/i\//);
      expect(result.amount).toBe(499);
      expect(result.status).toBe("created");
    });
  });

  describe("createRazorpayOrder in Demo Mode", () => {
    it("should generate a simulated checkout order when demo mode is active", async () => {
      process.env.NEXT_PUBLIC_DEMO_MODE = "true";
      const order = await createRazorpayOrder({
        keyId: "rzp_test_mock",
        keySecret: "mock_secret",
        amount: 999,
        currency: "INR",
        receipt: "rcpt_test_100",
      });

      expect(order.id).toMatch(/^order_/);
      expect(order.amount).toBe(999);
      expect(order.currency).toBe("INR");
      expect(order.receipt).toBe("rcpt_test_100");
    });
  });
});
