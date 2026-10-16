// ============================================================
// POST /api/payments/razorpay/order
// Public Checkout Order Creation Endpoint
//
// Calculates price strictly from central PRICING_PLANS (tamper-proof),
// generates a Razorpay Order ID, and records a platform order in
// PENDING_PAYMENT state.
// ============================================================

import { NextResponse } from "next/server";
import { createRazorpayOrder } from "@/lib/razorpay/client";
import { PRICING_PLANS } from "@/lib/plans/config";
import { getPlatformClient } from "@/lib/supabase/projects";
import { isDemoMode } from "@/lib/mock/client";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const {
      plan_id = "pro",
      billing_cycle = "annual",
      currency = "INR",
      customer_email,
      customer_name,
      customer_phone,
    } = body;

    if (!customer_email) {
      return NextResponse.json({ error: "Customer email is required" }, { status: 400 });
    }

    // 1. Resolve plan from central source of truth (reject client-side price tampering)
    const plan = PRICING_PLANS.find((p) => p.id === plan_id) || PRICING_PLANS[1]; // default Pro
    const normalizedCurrency = (currency === "USD" ? "USD" : "INR") as "INR" | "USD";
    const isAnnual = billing_cycle === "annual";

    const unitPriceMonthly = plan.pricing[normalizedCurrency][isAnnual ? "annual" : "monthly"];
    const durationMonths = isAnnual ? 12 : 1;
    const totalAmount = unitPriceMonthly * durationMonths;

    const receiptId = `ord_${plan.id}_${Date.now().toString(36)}`;

    // 2. Resolve credentials (test vs live)
    const isDemo = isDemoMode();
    let keyId = process.env.RAZORPAY_KEY_ID || "rzp_test_wacrm_demo_key";
    let keySecret = process.env.RAZORPAY_KEY_SECRET || "mock_rzp_secret_key";

    if (!isDemo) {
      try {
        const platformDb = getPlatformClient();
        const { data: settings } = await platformDb
          .from("platform_billing_settings")
          .select("razorpay_key_id, razorpay_key_secret, razorpay_enabled")
          .eq("id", "default")
          .maybeSingle();

        if (settings?.razorpay_key_id && settings?.razorpay_key_secret) {
          keyId = settings.razorpay_key_id;
          keySecret = settings.razorpay_key_secret;
        }
      } catch (dbErr) {
        // Fall back to env credentials
      }
    }

    // 3. Create Order on Razorpay
    const rzpOrder = await createRazorpayOrder({
      keyId,
      keySecret,
      amount: totalAmount,
      currency: normalizedCurrency,
      receipt: receiptId,
      notes: {
        plan_id: plan.id,
        plan_name: plan.name,
        billing_cycle: isAnnual ? "annual" : "monthly",
        duration_months: String(durationMonths),
        customer_email,
        customer_name: customer_name || "",
        customer_phone: customer_phone || "",
      },
    });

    // 4. Record order in platform_orders table
    if (!isDemo) {
      try {
        const platformDb = getPlatformClient();
        await platformDb.from("platform_orders").insert({
          razorpay_order_id: rzpOrder.id,
          customer_email,
          customer_name: customer_name || null,
          customer_phone: customer_phone || null,
          plan_id: plan.id,
          plan_name: plan.name,
          billing_cycle: isAnnual ? "annual" : "monthly",
          duration_months: durationMonths,
          amount: totalAmount,
          currency: normalizedCurrency,
          status: "PENDING_PAYMENT",
          provisioning_status: "not_started",
          verification_state: "unverified",
          idempotency_key: `order_init_${rzpOrder.id}`,
          state_history: [
            {
              from: "PENDING_PAYMENT",
              to: "PENDING_PAYMENT",
              timestamp: new Date().toISOString(),
              reason: "Order created via public checkout",
              actor: "system",
            },
          ],
        });
      } catch (insertErr) {
        console.warn("[order] Failed to insert platform order record:", insertErr);
      }
    }

    return NextResponse.json({
      success: true,
      orderId: rzpOrder.id,
      amount: totalAmount,
      currency: normalizedCurrency,
      keyId,
      plan: {
        id: plan.id,
        name: plan.name,
        billing_cycle: isAnnual ? "annual" : "monthly",
        durationMonths,
      },
    });
  } catch (err: any) {
    console.error("[api/payments/razorpay/order] Error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to create checkout order" },
      { status: 500 }
    );
  }
}
