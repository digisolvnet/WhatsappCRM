// ============================================================
// POST /api/payments/razorpay/verify
// Server-Side Payment Verification & State Transition
//
// 1. Verifies HMAC-SHA256 signature using Razorpay Key Secret.
// 2. Transitions order state PENDING_PAYMENT -> PAID -> PROVISIONING -> ACTIVE.
// 3. Executes idempotent tenant provisioning.
// 4. NEVER activates subscriptions without valid server-verified signature.
// ============================================================

import { NextResponse } from "next/server";
import { verifyRazorpayPaymentSignature } from "@/lib/razorpay/client";
import { getPlatformClient } from "@/lib/supabase/projects";
import { isDemoMode } from "@/lib/mock/client";
import { MOCK_SUBSCRIBERS, MOCK_SUBSCRIPTION_PAYMENTS, MOCK_PLATFORM_SETTINGS } from "@/lib/mock/data";
import {
  transitionOrderState,
  executeTenantProvisioning,
  type PlatformOrder,
} from "@/lib/payments/order-machine";

export async function POST(request: Request) {
  try {
    const isDemo = isDemoMode();
    const body = await request.json().catch(() => ({}));
    const {
      order_id,
      payment_id,
      signature,
      subscriber_id,
      months = 1,
    } = body;

    if (!order_id || !payment_id || !signature) {
      return NextResponse.json(
        { error: "order_id, payment_id, and signature are required for verification" },
        { status: 400 }
      );
    }

    // 1. Resolve key secret
    let keySecret = process.env.RAZORPAY_KEY_SECRET || "mock_rzp_secret_key";
    let defaultMonthly = 999;
    let defaultCurrency = "INR";

    if (!isDemo) {
      try {
        const platformDb = getPlatformClient();
        const { data: settings } = await platformDb
          .from("platform_billing_settings")
          .select("razorpay_key_secret, default_monthly_price, default_currency")
          .eq("id", "default")
          .maybeSingle();

        if (settings?.razorpay_key_secret) {
          keySecret = settings.razorpay_key_secret;
        }
        if (settings?.default_monthly_price) defaultMonthly = Number(settings.default_monthly_price);
        if (settings?.default_currency) defaultCurrency = settings.default_currency;
      } catch (dbErr) {
        // Fall back to env
      }
    }

    // 2. Cryptographic Signature Verification
    const isValid = verifyRazorpayPaymentSignature({
      keySecret,
      orderId: order_id,
      paymentId: payment_id,
      signature,
    });

    if (!isValid) {
      return NextResponse.json(
        { error: "Payment verification failed: Invalid cryptographic signature" },
        { status: 400 }
      );
    }

    const numMonths = Number(months) || 1;
    const daysToAdd = numMonths * 30;

    // 3. Demo Mode Handling
    if (isDemo) {
      const sub = MOCK_SUBSCRIBERS.find((s) => s.id === subscriber_id) || MOCK_SUBSCRIBERS[0];
      const baseDate =
        sub.current_period_ends_at && new Date(sub.current_period_ends_at) > new Date()
          ? new Date(sub.current_period_ends_at)
          : new Date();

      const newExpiry = new Date(baseDate.getTime() + daysToAdd * 24 * 3600 * 1000);
      sub.current_period_start = new Date().toISOString();
      sub.current_period_ends_at = newExpiry.toISOString();
      sub.subscription_status = "active";
      sub.reminder_count = 0;

      const monthlyPrice = Number(sub.monthly_price || defaultMonthly);
      const totalAmount = monthlyPrice * numMonths;

      const paymentRecord = {
        id: `pay_${Date.now()}`,
        account_id: sub.id,
        account_name: sub.name,
        amount: totalAmount,
        currency: sub.currency || defaultCurrency,
        status: "completed",
        payment_method: "razorpay",
        reference_id: payment_id,
        period_start: new Date().toISOString(),
        period_end: newExpiry.toISOString(),
        notes: `Verified Razorpay Checkout (Order: ${order_id})`,
        created_at: new Date().toISOString(),
      };
      MOCK_SUBSCRIPTION_PAYMENTS.unshift(paymentRecord);

      return NextResponse.json({
        success: true,
        status: "ACTIVE",
        verification_state: "signature_verified",
        message: `Payment verified. Subscription active until ${newExpiry.toLocaleDateString()}`,
        subscriber: sub,
        payment: paymentRecord,
      });
    }

    // 4. Live Production Database Mode
    const platformDb = getPlatformClient();

    // Check if platform order exists
    const { data: existingOrder } = await platformDb
      .from("platform_orders")
      .select("*")
      .eq("razorpay_order_id", order_id)
      .maybeSingle();

    let targetAccountId = subscriber_id || existingOrder?.account_id;

    // Fetch existing customer account if exists
    let existingAccount: any = null;
    if (targetAccountId) {
      const { data: acc } = await platformDb
        .from("accounts")
        .select("*")
        .eq("id", targetAccountId)
        .maybeSingle();
      existingAccount = acc;
    }

    // Build or update order state machine
    const initialOrder: PlatformOrder = existingOrder || {
      id: `ord_${Date.now()}`,
      razorpay_order_id: order_id,
      razorpay_payment_id: payment_id,
      account_id: targetAccountId,
      customer_email: existingAccount?.billing_email || "customer@example.com",
      customer_name: existingAccount?.name || "Customer",
      plan_id: existingAccount?.plan_name || "pro",
      plan_name: existingAccount?.plan_name || "Professional",
      billing_cycle: "monthly",
      duration_months: numMonths,
      amount: defaultMonthly * numMonths,
      currency: defaultCurrency,
      status: "PENDING_PAYMENT",
      provisioning_status: "not_started",
      verification_state: "unverified",
      state_history: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Transition state: PENDING_PAYMENT -> PAID
    const paidOrder = transitionOrderState(initialOrder, "PAID", {
      reason: "Razorpay signature verified via frontend checkout callback",
      actor: "server_verify",
      referenceId: payment_id,
    });
    paidOrder.razorpay_payment_id = payment_id;
    paidOrder.verification_state = "signature_verified";

    // Transition state: PAID -> ACTIVE (Idempotent Provisioning)
    const { updatedOrder, result: provResult } = executeTenantProvisioning(paidOrder, existingAccount);

    targetAccountId = provResult.accountId;

    // Update account renewal expiry
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
        .eq("id", targetAccountId);
    }

    // Persist updated platform order
    await platformDb.from("platform_orders").upsert({
      razorpay_order_id: order_id,
      razorpay_payment_id: payment_id,
      account_id: targetAccountId,
      customer_email: updatedOrder.customer_email,
      customer_name: updatedOrder.customer_name,
      plan_id: updatedOrder.plan_id,
      plan_name: updatedOrder.plan_name,
      billing_cycle: updatedOrder.billing_cycle,
      duration_months: updatedOrder.duration_months,
      amount: updatedOrder.amount,
      currency: updatedOrder.currency,
      status: updatedOrder.status,
      provisioning_status: updatedOrder.provisioning_status,
      verification_state: updatedOrder.verification_state,
      state_history: updatedOrder.state_history,
      updated_at: new Date().toISOString(),
    }, { onConflict: "razorpay_order_id" });

    // Insert payment record
    await platformDb.from("subscription_payments").insert({
      account_id: targetAccountId,
      amount: updatedOrder.amount,
      currency: updatedOrder.currency,
      status: "completed",
      payment_method: "razorpay",
      reference_id: payment_id,
      period_start: new Date().toISOString(),
      period_end: newExpiry.toISOString(),
      notes: `Verified Razorpay Checkout (Order: ${order_id})`,
    });

    return NextResponse.json({
      success: true,
      status: updatedOrder.status,
      verification_state: updatedOrder.verification_state,
      message: `Payment verified. Subscription active until ${newExpiry.toLocaleDateString()}`,
      accountId: targetAccountId,
    });
  } catch (error: any) {
    console.error("[api/payments/razorpay/verify] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to verify Razorpay payment" },
      { status: 500 }
    );
  }
}
