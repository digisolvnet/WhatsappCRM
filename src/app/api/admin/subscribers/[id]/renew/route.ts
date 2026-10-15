import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { MOCK_SUBSCRIBERS, MOCK_SUBSCRIPTION_PAYMENTS } from "@/lib/mock/data";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const daysToAdd = Number(body.days || 30);
    const amount = Number(body.amount || 49);
    const paymentMethod = body.paymentMethod || "manual";
    const referenceId = body.referenceId || `ref_${Date.now()}`;
    const notes = body.notes || "Subscription renewed by Super Admin";

    const isDemo =
      process.env.NEXT_PUBLIC_DEMO_MODE === "true" &&
      process.env.NEXT_PUBLIC_SUPABASE_URL?.includes("placeholder-project");

    if (isDemo) {
      const sub = MOCK_SUBSCRIBERS.find((s) => s.id === id);
      if (!sub) {
        return NextResponse.json({ error: "Subscriber not found" }, { status: 404 });
      }

      // If current expiry is in the future, add days from current expiry. If in the past, add from now.
      const baseDate = new Date(sub.current_period_ends_at) > new Date()
        ? new Date(sub.current_period_ends_at)
        : new Date();

      const newExpiry = new Date(baseDate.getTime() + daysToAdd * 24 * 3600 * 1000);
      sub.current_period_start = new Date().toISOString();
      sub.current_period_ends_at = newExpiry.toISOString();
      sub.subscription_status = "active";
      sub.reminder_count = 0;

      // Record payment
      const paymentRecord = {
        id: `pay_${Date.now()}`,
        account_id: sub.id,
        account_name: sub.name,
        amount,
        currency: sub.currency || "USD",
        status: "completed",
        payment_method: paymentMethod,
        reference_id: referenceId,
        period_start: new Date().toISOString(),
        period_end: newExpiry.toISOString(),
        notes,
        created_at: new Date().toISOString(),
      };
      MOCK_SUBSCRIPTION_PAYMENTS.unshift(paymentRecord);

      return NextResponse.json({
        success: true,
        message: `Subscription extended by ${daysToAdd} days until ${newExpiry.toLocaleDateString()}`,
        subscriber: sub,
        payment: paymentRecord,
      });
    }

    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const dbClient = serviceKey
      ? createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey, {
          auth: { autoRefreshToken: false, persistSession: false },
        })
      : supabase;

    const { data: account, error: accError } = await dbClient
      .from("accounts")
      .select("*")
      .eq("id", id)
      .single();

    if (accError || !account) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    const baseDate = new Date(account.current_period_ends_at) > new Date()
      ? new Date(account.current_period_ends_at)
      : new Date();

    const newExpiry = new Date(baseDate.getTime() + daysToAdd * 24 * 3600 * 1000);

    // Update account validity & status
    const { data: updatedAccount, error: updateError } = await dbClient
      .from("accounts")
      .update({
        subscription_status: "active",
        current_period_start: new Date().toISOString(),
        current_period_ends_at: newExpiry.toISOString(),
        reminder_count: 0,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // Insert payment record
    await dbClient.from("subscription_payments").insert({
      account_id: id,
      amount: amount || account.monthly_price,
      currency: account.currency || "USD",
      status: "completed",
      payment_method: paymentMethod,
      reference_id: referenceId,
      period_start: new Date().toISOString(),
      period_end: newExpiry.toISOString(),
      notes,
      recorded_by: user.id,
    });

    return NextResponse.json({
      success: true,
      message: `Subscription extended by ${daysToAdd} days until ${newExpiry.toLocaleDateString()}`,
      subscriber: updatedAccount,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to renew subscription" }, { status: 500 });
  }
}
