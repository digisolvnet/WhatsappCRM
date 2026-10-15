import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createRazorpayOrder } from "@/lib/razorpay/client";
import {
  MOCK_SUBSCRIBERS,
  MOCK_PLATFORM_SETTINGS,
  MOCK_ACCOUNT_ID,
} from "@/lib/mock/data";

export async function POST(request: Request) {
  try {
    const isDemo = process.env.NEXT_PUBLIC_DEMO_MODE === "true";
    const body = await request.json().catch(() => ({}));
    const { subscriber_id, months = 1 } = body;

    let sub: any = null;
    let platformSettings: any = null;

    if (isDemo) {
      sub = MOCK_SUBSCRIBERS.find((s) => s.id === subscriber_id) || MOCK_SUBSCRIBERS[0];
      platformSettings = MOCK_PLATFORM_SETTINGS;

      const monthlyPrice = Number(sub.monthly_price || platformSettings.default_monthly_price || 49);
      const totalAmount = monthlyPrice * months;
      const currency = sub.currency || platformSettings.default_currency || "INR";

      const order = await createRazorpayOrder({
        keyId: platformSettings.razorpay_key_id || "rzp_test_wacrm_demo_key",
        keySecret: platformSettings.razorpay_key_secret || "mock_rzp_secret_key",
        amount: totalAmount,
        currency,
        receipt: `sub_rcpt_${sub.id}_${Date.now()}`,
        notes: {
          subscriber_id: sub.id,
          months: String(months),
          account_name: sub.name,
        },
      });

      return NextResponse.json({
        success: true,
        orderId: order.id,
        amount: totalAmount,
        currency,
        keyId: platformSettings.razorpay_key_id || "rzp_test_wacrm_demo_key",
        subscriber: {
          id: sub.id,
          name: sub.name,
          owner_name: sub.owner_name,
          owner_email: sub.owner_email,
          billing_phone: sub.billing_phone,
        },
      });
    }

    const supabase = await createClient();
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const dbClient = serviceKey
      ? createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey, {
          auth: { autoRefreshToken: false, persistSession: false },
        })
      : supabase;

    // 1. Fetch subscriber account
    const { data: account } = await dbClient
      .from("accounts")
      .select("*")
      .eq("id", subscriber_id)
      .maybeSingle();

    if (!account) {
      return NextResponse.json({ error: "Subscriber account not found" }, { status: 404 });
    }

    // 2. Fetch platform billing settings for Razorpay credentials
    const { data: settings } = await dbClient
      .from("platform_billing_settings")
      .select("*")
      .eq("id", "default")
      .maybeSingle();

    if (!settings?.razorpay_enabled || !settings?.razorpay_key_id || !settings?.razorpay_key_secret) {
      return NextResponse.json(
        {
          error:
            "Platform Razorpay gateway is not enabled. Please configure Razorpay Key ID and Secret in Super Admin Settings.",
        },
        { status: 400 }
      );
    }

    const monthlyPrice = Number(account.monthly_price || settings.default_monthly_price || 49);
    const totalAmount = monthlyPrice * months;
    const currency = account.currency || settings.default_currency || "INR";

    // 3. Create order on Razorpay
    const order = await createRazorpayOrder({
      keyId: settings.razorpay_key_id,
      keySecret: settings.razorpay_key_secret,
      amount: totalAmount,
      currency,
      receipt: `sub_${account.id.slice(0, 8)}_${Date.now()}`,
      notes: {
        account_id: account.id,
        months: String(months),
        account_name: account.name,
      },
    });

    return NextResponse.json({
      success: true,
      orderId: order.id,
      amount: totalAmount,
      currency,
      keyId: settings.razorpay_key_id,
      subscriber: {
        id: account.id,
        name: account.name,
        billing_email: account.billing_email,
        billing_phone: account.billing_phone,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to initiate subscription checkout" }, { status: 500 });
  }
}
