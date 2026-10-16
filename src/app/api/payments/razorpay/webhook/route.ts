// ============================================================
// POST /api/payments/razorpay/webhook
// Webhook Processing with Signature Verification & Idempotency
//
// Handles:
// - payment_link.paid (CRM in-chat customer payments)
// - order.paid / payment.captured (SaaS subscription orders)
// - payment.failed (Failed order state transition)
// - refund.created (Subscription refund handling)
//
// Features:
// - Idempotent replay protection using processed_webhook_events table.
// - Out-of-order and delayed event reconciliation.
// - Authoritative platform_orders state machine updates.
// ============================================================

import { NextResponse } from "next/server";
import { verifyRazorpayWebhookSignature } from "@/lib/razorpay/client";
import { sendMessageToConversation } from "@/lib/whatsapp/send-message";
import { getPlatformClient } from "@/lib/supabase/projects";
import { isDemoMode } from "@/lib/mock/client";
import {
  transitionOrderState,
  executeTenantProvisioning,
  type PlatformOrder,
} from "@/lib/payments/order-machine";
import {
  MOCK_CRM_PAYMENT_LINKS,
  MOCK_SUBSCRIBERS,
  MOCK_SUBSCRIPTION_PAYMENTS,
} from "@/lib/mock/data";

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get("x-razorpay-signature") || "";

    const isDemo = isDemoMode();

    let event: any = {};
    try {
      event = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
    }

    const eventId = event.id || `evt_${event.event}_${Date.now()}`;
    const eventType = event.event;
    const payload = event.payload || {};

    // ------------------------------------------------------------
    // 1. Demo Mode Simulation
    // ------------------------------------------------------------
    if (isDemo) {
      if (eventType === "payment_link.paid") {
        const plinkEntity = payload.payment_link?.entity || {};
        const paymentEntity = payload.payment?.entity || {};
        const plinkId = plinkEntity.id;

        const found = MOCK_CRM_PAYMENT_LINKS.find(
          (p) => p.razorpay_payment_link_id === plinkId || p.id === plinkId
        );
        if (found) {
          found.status = "paid";
          found.razorpay_payment_id = paymentEntity.id || `pay_${Date.now()}`;
          found.paid_at = new Date().toISOString();
        }
      } else if (eventType === "order.paid" || eventType === "payment.captured") {
        const orderEntity = payload.order?.entity || {};
        const paymentEntity = payload.payment?.entity || {};
        const notes = orderEntity.notes || paymentEntity.notes || {};
        const subscriberId = notes.subscriber_id || notes.account_id;

        if (subscriberId) {
          const sub = MOCK_SUBSCRIBERS.find((s) => s.id === subscriberId);
          if (sub) {
            const months = Number(notes.months || notes.duration_months) || 1;
            const daysToAdd = months * 30;
            const baseDate =
              sub.current_period_ends_at && new Date(sub.current_period_ends_at) > new Date()
                ? new Date(sub.current_period_ends_at)
                : new Date();
            const newExpiry = new Date(baseDate.getTime() + daysToAdd * 24 * 3600 * 1000);
            sub.subscription_status = "active";
            sub.reminder_count = 0;
            sub.current_period_ends_at = newExpiry.toISOString();

            MOCK_SUBSCRIPTION_PAYMENTS.unshift({
              id: `pay_${Date.now()}`,
              account_id: sub.id,
              account_name: sub.name,
              amount: (paymentEntity.amount ? paymentEntity.amount / 100 : sub.monthly_price) || 999,
              currency: sub.currency || "INR",
              status: "completed",
              payment_method: "razorpay",
              reference_id: paymentEntity.id || orderEntity.id || `ref_${Date.now()}`,
              period_start: new Date().toISOString(),
              period_end: newExpiry.toISOString(),
              notes: `Razorpay Webhook: ${eventType}`,
              created_at: new Date().toISOString(),
            });
          }
        }
      }

      return NextResponse.json({ status: "ok", mode: "demo", event: eventType, eventId });
    }

    // ------------------------------------------------------------
    // 2. Production Database Mode
    // ------------------------------------------------------------
    const platformDb = getPlatformClient();

    // 2.1 Check Idempotency Registry (processed_webhook_events)
    const { data: alreadyProcessed } = await platformDb
      .from("processed_webhook_events")
      .select("event_id")
      .eq("event_id", eventId)
      .maybeSingle();

    if (alreadyProcessed) {
      console.info(`[webhook] Duplicate event ignored (idempotent replay): ${eventId}`);
      return NextResponse.json({ status: "ignored_duplicate", eventId }, { status: 200 });
    }

    // 2.2 Verify Signature
    let webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || "";

    const { data: platformSettings } = await platformDb
      .from("platform_billing_settings")
      .select("razorpay_webhook_secret")
      .eq("id", "default")
      .maybeSingle();

    if (platformSettings?.razorpay_webhook_secret) {
      webhookSecret = platformSettings.razorpay_webhook_secret;
    }

    let verified = false;
    if (webhookSecret && signature) {
      verified = verifyRazorpayWebhookSignature({
        webhookSecret,
        rawPayload: rawBody,
        signature,
      });
    }

    // If signature provided and webhook secret configured, reject on mismatch
    if (signature && webhookSecret && !verified) {
      console.warn(`[webhook] Rejected Razorpay webhook with invalid signature: ${eventId}`);
      return NextResponse.json({ error: "Invalid Razorpay webhook signature" }, { status: 400 });
    }

    // 2.3 Record Event in Idempotency Registry before processing
    await platformDb.from("processed_webhook_events").insert({
      event_id: eventId,
      event_type: eventType,
      payload_summary: {
        entity_id: payload.order?.entity?.id || payload.payment?.entity?.id || payload.payment_link?.entity?.id,
      },
    });

    // 2.4 Event: In-Chat CRM Payment Link Paid
    if (eventType === "payment_link.paid") {
      const plink = payload.payment_link?.entity || {};
      const payment = payload.payment?.entity || {};
      const plinkId = plink.id;

      const { data: updatedLink } = await platformDb
        .from("crm_payment_links")
        .update({
          status: "paid",
          razorpay_payment_id: payment.id || null,
          paid_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("razorpay_payment_link_id", plinkId)
        .select("id, account_id, conversation_id, amount, currency, description")
        .maybeSingle();

      const conversationId = updatedLink?.conversation_id || plink.notes?.conversation_id;
      const targetAccountId = updatedLink?.account_id || plink.notes?.account_id;

      if (conversationId && targetAccountId) {
        const paidAmount = plink.amount ? plink.amount / 100 : updatedLink?.amount;
        const cur = (plink.currency || updatedLink?.currency || "INR").toUpperCase();
        const confirmationMsg = `✅ *Payment Received Successfully!*\n\n• Amount: ${cur} ${paidAmount}\n• Reference: ${payment.id || "N/A"}\n• Status: Verified\n\nThank you for your payment!`;

        try {
          await sendMessageToConversation(platformDb, targetAccountId, {
            conversationId,
            messageType: "text",
            contentText: confirmationMsg,
          });
        } catch (msgErr: any) {
          console.warn("Could not post payment confirmation to chat:", msgErr?.message);
        }
      }
    }
    // 2.5 Event: SaaS Subscription Order Paid / Captured
    else if (eventType === "order.paid" || eventType === "payment.captured") {
      const order = payload.order?.entity || {};
      const payment = payload.payment?.entity || {};
      const orderId = order.id || payment.order_id;
      const notes = order.notes || payment.notes || {};
      const subscriberId = notes.subscriber_id || notes.account_id;

      // Look up platform order
      let { data: platOrder } = await platformDb
        .from("platform_orders")
        .select("*")
        .eq("razorpay_order_id", orderId)
        .maybeSingle();

      if (platOrder) {
        // Transition: PENDING_PAYMENT -> PAID
        if (platOrder.status === "PENDING_PAYMENT") {
          platOrder = transitionOrderState(platOrder, "PAID", {
            reason: `Webhook confirmed: ${eventType}`,
            actor: "webhook",
            referenceId: payment.id,
          });
          platOrder.verification_state = "webhook_verified";
          platOrder.razorpay_payment_id = payment.id || platOrder.razorpay_payment_id;
        }

        // Execute provisioning
        let existingAccount: any = null;
        const accountTarget = subscriberId || platOrder.account_id;
        if (accountTarget) {
          const { data: acc } = await platformDb
            .from("accounts")
            .select("*")
            .eq("id", accountTarget)
            .maybeSingle();
          existingAccount = acc;
        }

        const { updatedOrder, result: provResult } = executeTenantProvisioning(platOrder, existingAccount);

        // Update platform order record
        await platformDb.from("platform_orders").upsert({
          razorpay_order_id: orderId,
          razorpay_payment_id: payment.id || updatedOrder.razorpay_payment_id,
          account_id: provResult.accountId,
          status: updatedOrder.status,
          provisioning_status: updatedOrder.provisioning_status,
          verification_state: "webhook_verified",
          state_history: updatedOrder.state_history,
          updated_at: new Date().toISOString(),
        }, { onConflict: "razorpay_order_id" });

        // Update subscriber account
        const months = Number(notes.months || notes.duration_months || updatedOrder.duration_months) || 1;
        const daysToAdd = months * 30;
        const baseDate =
          existingAccount?.current_period_ends_at && new Date(existingAccount.current_period_ends_at) > new Date()
            ? new Date(existingAccount.current_period_ends_at)
            : new Date();
        const newExpiry = new Date(baseDate.getTime() + daysToAdd * 24 * 3600 * 1000);

        if (existingAccount) {
          await platformDb
            .from("accounts")
            .update({
              subscription_status: "active",
              current_period_start: new Date().toISOString(),
              current_period_ends_at: newExpiry.toISOString(),
              reminder_count: 0,
              updated_at: new Date().toISOString(),
            })
            .eq("id", provResult.accountId);
        }

        // Insert payment log
        const paidAmount = payment.amount ? payment.amount / 100 : updatedOrder.amount;
        await platformDb.from("subscription_payments").insert({
          account_id: provResult.accountId,
          amount: paidAmount,
          currency: payment.currency || updatedOrder.currency || "INR",
          status: "completed",
          payment_method: "razorpay",
          reference_id: payment.id || orderId,
          period_start: new Date().toISOString(),
          period_end: newExpiry.toISOString(),
          notes: `Webhook verified payment: ${eventType}`,
        });
      }
    }
    // 2.6 Event: Payment Failed
    else if (eventType === "payment.failed") {
      const payment = payload.payment?.entity || {};
      const orderId = payment.order_id;
      if (orderId) {
        const { data: platOrder } = await platformDb
          .from("platform_orders")
          .select("*")
          .eq("razorpay_order_id", orderId)
          .maybeSingle();

        if (platOrder && platOrder.status === "PENDING_PAYMENT") {
          const failedOrder = transitionOrderState(platOrder, "FAILED", {
            reason: `Payment failed on provider: ${payment.error_description || "Declined"}`,
            actor: "webhook",
            referenceId: payment.id,
          });

          await platformDb
            .from("platform_orders")
            .update({
              status: failedOrder.status,
              provisioning_status: failedOrder.provisioning_status,
              state_history: failedOrder.state_history,
              updated_at: new Date().toISOString(),
            })
            .eq("razorpay_order_id", orderId);
        }
      }
    }
    // 2.7 Event: Refund Created
    else if (eventType === "refund.created") {
      const refund = payload.refund?.entity || {};
      const paymentId = refund.payment_id;

      if (paymentId) {
        await platformDb
          .from("subscription_payments")
          .update({ status: "refunded" })
          .eq("reference_id", paymentId);

        // Update platform order to REFUNDED
        const { data: platOrder } = await platformDb
          .from("platform_orders")
          .select("*")
          .eq("razorpay_payment_id", paymentId)
          .maybeSingle();

        if (platOrder && platOrder.status === "ACTIVE") {
          const refundedOrder = transitionOrderState(platOrder, "REFUNDED", {
            reason: `Refund created: ${refund.id}`,
            actor: "webhook",
            referenceId: refund.id,
          });

          await platformDb
            .from("platform_orders")
            .update({
              status: refundedOrder.status,
              state_history: refundedOrder.state_history,
              updated_at: new Date().toISOString(),
            })
            .eq("id", platOrder.id);
        }
      }
    }

    return NextResponse.json({ status: "success", received: eventType, eventId });
  } catch (error: any) {
    console.error("[api/payments/razorpay/webhook] Error:", error);
    return NextResponse.json({ error: error.message || "Webhook processing failed" }, { status: 500 });
  }
}
