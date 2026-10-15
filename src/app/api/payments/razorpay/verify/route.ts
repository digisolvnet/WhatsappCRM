import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { verifyRazorpayPaymentSignature } from "@/lib/razorpay/client";
import { MOCK_SUBSCRIBERS, MOCK_SUBSCRIPTION_PAYMENTS, MOCK_PLATFORM_SETTINGS } from "@/lib/mock/data";

export async function POST(request: Request) {
  try {
    const isDemo =
      process.env.NEXT_PUBLIC_DEMO_MODE === "true" ||
      process.env.NEXT_PUBLIC_SUPABASE_URL?.includes("placeholder-project");

    const body = await request.json().catch(() => ({}));
    const {
      order_id,
      payment_id,
      signature,
      subscriber_id,
      months = 1,
    } = body;

    if (!order_id || !payment_id || !signature || !subscriber_id) {
      return NextResponse.json(
        { error: "order_id, payment_id, signature, and subscriber_id are required" },
        { status: 400 }
      );
    }

    const numMonths = Number(months) || 1;
    const daysToAdd = numMonths * 30;

    if (isDemo) {
      const sub = MOCK_SUBSCRIBERS.find((s) => s.id === subscriber_id) || MOCK_SUBSCRIBERS[0];
      const platformSettings = MOCK_PLATFORM_SETTINGS;
      const keySecret = platformSettings.razorpay_key_secret || "mock_rzp_secret_key";

      const isValid = verifyRazorpayPaymentSignature({
        keySecret,
        orderId: order_id,
        paymentId: payment_id,
        signature,
      });

      if (!isValid && !signature.startsWith("demo_sig_")) {
        return NextResponse.json({ error: "Invalid Razorpay payment signature" }, { status: 400 });
      }

      const baseDate =
        sub.current_period_ends_at && new Date(sub.current_period_ends_at) > new Date()
          ? new Date(sub.current_period_ends_at)
          : new Date();

      const newExpiry = new Date(baseDate.getTime() + daysToAdd * 24 * 3600 * 1000);
      sub.current_period_start = new Date().toISOString();
      sub.current_period_ends_at = newExpiry.toISOString();
      sub.subscription_status = "active";
      sub.reminder_count = 0;

      const monthlyPrice = Number(sub.monthly_price || platformSettings.default_monthly_price || 49);
      const totalAmount = monthlyPrice * numMonths;

      const paymentRecord = {
        id: `pay_${Date.now()}`,
        account_id: sub.id,
        account_name: sub.name,
        amount: totalAmount,
        currency: sub.currency || "INR",
        status: "completed",
        payment_method: "razorpay",
        reference_id: payment_id,
        period_start: new Date().toISOString(),
        period_end: newExpiry.toISOString(),
        notes: `Razorpay Online Checkout (Order: ${order_id})`,
        created_at: new Date().toISOString(),
      };
      MOCK_SUBSCRIPTION_PAYMENTS.unshift(paymentRecord);

      return NextResponse.json({
        success: true,
        message: `Payment verified. Subscription renewed for ${numMonths} month(s) until ${newExpiry.toLocaleDateString()}`,
        subscriber: sub,
        payment: paymentRecord,
      });
    }

    // Live Supabase Mode
    const supabase = await createClient();
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const dbClient = serviceKey
      ? createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey, {
          auth: { autoRefreshToken: false, persistSession: false },
        })
      : supabase;

    // 1. Fetch platform settings for secret
    const { data: settings } = await dbClient
      .from("platform_billing_settings")
      .select("razorpay_key_secret, default_monthly_price, default_currency")
      .eq("id", "default")
      .maybeSingle();

    const keySecret = settings?.razorpay_key_secret;
    if (!keySecret) {
      return NextResponse.json({ error: "Platform Razorpay secret is not configured" }, { status: 400 });
    }

    // 2. Verify signature
    const isValid = verifyRazorpayPaymentSignature({
      keySecret,
      orderId: order_id,
      paymentId: payment_id,
      signature,
    });

    if (!isValid) {
      return NextResponse.json({ error: "Invalid Razorpay payment signature" }, { status: 400 });
    }

    // 3. Fetch account
    const { data: account, error: accErr } = await dbClient
      .from("accounts")
      .select("*")
      .eq("id", subscriber_id)
      .single();

    if (accErr || !account) {
      return NextResponse.json({ error: "Subscriber account not found" }, { status: 404 });
    }

    const baseDate =
      account.current_period_ends_at && new Date(account.current_period_ends_at) > new Date()
        ? new Date(account.current_period_ends_at)
        : new Date();

    const newExpiry = new Date(baseDate.getTime() + daysToAdd * 24 * 3600 * 1000);
    const monthlyPrice = Number(account.monthly_price || settings.default_monthly_price || 49);
    const totalAmount = monthlyPrice * numMonths;
    const currency = account.currency || settings.default_currency || "INR";

    // 4. Update account subscription status
    const { data: updatedAccount, error: updateErr } = await dbClient
      .from("accounts")
      .update({
        subscription_status: "active",
        current_period_start: new Date().toISOString(),
        current_period_ends_at: newExpiry.toISOString(),
        reminder_count: 0,
        updated_at: new Date().toISOString(),
      })
      .eq("id", subscriber_id)
      .select()
      .single();

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    // 5. Insert subscription payment audit record
    await dbClient.from("subscription_payments").insert({
      account_id: subscriber_id,
      amount: totalAmount,
      currency,
      status: "completed",
      payment_method: "razorpay",
      reference_id: payment_id,
      period_start: new Date().toISOString(),
      period_end: newExpiry.toISOString(),
      notes: `Razorpay Online Checkout (Order: ${order_id})`,
    });

    return NextResponse.json({
      success: true,
      message: `Payment verified. Subscription renewed until ${newExpiry.toLocaleDateString()}`,
      subscriber: updatedAccount,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to verify Razorpay payment" }, { status: 500 });
  }
}
