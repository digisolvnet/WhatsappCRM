import { NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { verifyRazorpayWebhookSignature } from "@/lib/razorpay/client";
import { sendMessageToConversation } from "@/lib/whatsapp/send-message";
import {
  MOCK_CRM_PAYMENT_LINKS,
  MOCK_SUBSCRIBERS,
  MOCK_SUBSCRIPTION_PAYMENTS,
  MOCK_PLATFORM_SETTINGS,
} from "@/lib/mock/data";

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get("x-razorpay-signature") || "";

    const isDemo =
      process.env.NEXT_PUBLIC_DEMO_MODE === "true" ||
      process.env.NEXT_PUBLIC_SUPABASE_URL?.includes("placeholder-project");

    let event: any = {};
    try {
      event = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
    }

    const eventType = event.event;
    const payload = event.payload || {};

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
            const months = Number(notes.months) || 1;
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
              amount: (paymentEntity.amount ? paymentEntity.amount / 100 : sub.monthly_price) || 49,
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

      return NextResponse.json({ status: "ok", mode: "demo", event: eventType });
    }

    // Live Database Mode
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceKey || !process.env.NEXT_PUBLIC_SUPABASE_URL) {
      return NextResponse.json({ error: "Supabase service configuration missing" }, { status: 500 });
    }

    const dbClient = createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // 1. Retrieve platform webhook secret
    const { data: platformSettings } = await dbClient
      .from("platform_billing_settings")
      .select("razorpay_webhook_secret")
      .eq("id", "default")
      .maybeSingle();

    let verified = false;

    // Check platform webhook secret if provided
    if (platformSettings?.razorpay_webhook_secret && signature) {
      verified = verifyRazorpayWebhookSignature({
        webhookSecret: platformSettings.razorpay_webhook_secret,
        rawPayload: rawBody,
        signature,
      });
    }

    // If not verified yet, check if workspace has a custom webhook secret
    const orderNotes = payload.order?.entity?.notes || payload.payment_link?.entity?.notes || {};
    const accountIdFromNotes = orderNotes.account_id;

    if (!verified && accountIdFromNotes && signature) {
      const { data: gw } = await dbClient
        .from("account_payment_gateways")
        .select("webhook_secret")
        .eq("account_id", accountIdFromNotes)
        .eq("provider", "razorpay")
        .maybeSingle();

      if (gw?.webhook_secret) {
        verified = verifyRazorpayWebhookSignature({
          webhookSecret: gw.webhook_secret,
          rawPayload: rawBody,
          signature,
        });
      }
    }

    // In production, if webhook secrets are configured, reject unverified calls
    if (signature && (platformSettings?.razorpay_webhook_secret || accountIdFromNotes) && !verified) {
      return NextResponse.json({ error: "Invalid Razorpay webhook signature" }, { status: 400 });
    }

    // 2. Handle specific events
    if (eventType === "payment_link.paid") {
      const plink = payload.payment_link?.entity || {};
      const payment = payload.payment?.entity || {};
      const plinkId = plink.id;

      // Update crm_payment_links
      const { data: updatedLink } = await dbClient
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

      // Send confirmation to WhatsApp chat if conversation_id is linked
      const conversationId = updatedLink?.conversation_id || plink.notes?.conversation_id;
      const targetAccountId = updatedLink?.account_id || plink.notes?.account_id;

      if (conversationId && targetAccountId) {
        const paidAmount = plink.amount ? plink.amount / 100 : updatedLink?.amount;
        const cur = (plink.currency || updatedLink?.currency || "INR").toUpperCase();
        const paymentMethod = payment.method ? payment.method.toUpperCase() : "Razorpay";

        const confirmationMsg = `✅ *Payment Received Successfully!*\n\n• Amount: ${cur} ${paidAmount}\n• Payment ID: ${payment.id || "N/A"}\n• Method: ${paymentMethod}\n• Status: Confirmed\n\nThank you for your payment!`;

        try {
          await sendMessageToConversation(dbClient, targetAccountId, {
            conversationId,
            messageType: "text",
            contentText: confirmationMsg,
          });
        } catch (msgErr: any) {
          console.warn("Could not post payment confirmation to chat:", msgErr?.message);
        }
      }
    } else if (eventType === "order.paid" || eventType === "payment.captured") {
      const order = payload.order?.entity || {};
      const payment = payload.payment?.entity || {};
      const notes = order.notes || payment.notes || {};
      const subscriberId = notes.subscriber_id || notes.account_id;

      if (subscriberId) {
        const months = Number(notes.months) || 1;
        const daysToAdd = months * 30;

        const { data: account } = await dbClient
          .from("accounts")
          .select("*")
          .eq("id", subscriberId)
          .maybeSingle();

        if (account) {
          const baseDate =
            account.current_period_ends_at && new Date(account.current_period_ends_at) > new Date()
              ? new Date(account.current_period_ends_at)
              : new Date();
          const newExpiry = new Date(baseDate.getTime() + daysToAdd * 24 * 3600 * 1000);

          await dbClient
            .from("accounts")
            .update({
              subscription_status: "active",
              current_period_start: new Date().toISOString(),
              current_period_ends_at: newExpiry.toISOString(),
              reminder_count: 0,
              updated_at: new Date().toISOString(),
            })
            .eq("id", subscriberId);

          const paidAmount = payment.amount ? payment.amount / 100 : account.monthly_price;
          await dbClient.from("subscription_payments").insert({
            account_id: subscriberId,
            amount: paidAmount,
            currency: account.currency || "INR",
            status: "completed",
            payment_method: "razorpay",
            reference_id: payment.id || order.id || `webhook_${Date.now()}`,
            period_start: new Date().toISOString(),
            period_end: newExpiry.toISOString(),
            notes: `Webhook verified payment: ${eventType}`,
          });
        }
      }
    }

    return NextResponse.json({ status: "success", received: eventType });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Webhook processing failed" }, { status: 500 });
  }
}
