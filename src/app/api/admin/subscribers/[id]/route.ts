import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { MOCK_SUBSCRIBERS } from "@/lib/mock/data";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const isDemo =
      process.env.NEXT_PUBLIC_DEMO_MODE === "true" &&
      process.env.NEXT_PUBLIC_SUPABASE_URL?.includes("placeholder-project");

    const {
      subscription_status,
      plan_name,
      monthly_price,
      currency,
      current_period_ends_at,
      billing_phone,
      billing_email,
      payment_link,
      notes,
      auto_reminder_enabled,
    } = body;

    if (isDemo) {
      const sub = MOCK_SUBSCRIBERS.find((s) => s.id === id) as any;
      if (sub) {
        if (subscription_status !== undefined) sub.subscription_status = subscription_status;
        if (plan_name !== undefined) sub.plan_name = plan_name;
        if (monthly_price !== undefined) sub.monthly_price = Number(monthly_price);
        if (currency !== undefined) sub.currency = currency;
        if (current_period_ends_at !== undefined) sub.current_period_ends_at = current_period_ends_at;
        if (billing_phone !== undefined) sub.billing_phone = billing_phone;
        if (billing_email !== undefined) sub.billing_email = billing_email;
        if (payment_link !== undefined) sub.payment_link = payment_link;
        if (notes !== undefined) sub.notes = notes;
        if (auto_reminder_enabled !== undefined) sub.auto_reminder_enabled = auto_reminder_enabled;
      }
      return NextResponse.json({ success: true, subscriber: sub });
    }

    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const updates: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };
    if (subscription_status !== undefined) updates.subscription_status = subscription_status;
    if (plan_name !== undefined) updates.plan_name = plan_name;
    if (monthly_price !== undefined) updates.monthly_price = Number(monthly_price);
    if (currency !== undefined) updates.currency = currency;
    if (current_period_ends_at !== undefined) updates.current_period_ends_at = current_period_ends_at;
    if (billing_phone !== undefined) updates.billing_phone = billing_phone;
    if (billing_email !== undefined) updates.billing_email = billing_email;
    if (payment_link !== undefined) updates.payment_link = payment_link;
    if (notes !== undefined) updates.notes = notes;
    if (auto_reminder_enabled !== undefined) updates.auto_reminder_enabled = auto_reminder_enabled;

    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const dbClient = serviceKey
      ? createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey, {
          auth: { autoRefreshToken: false, persistSession: false },
        })
      : supabase;

    const { data: updated, error: updateError } = await dbClient
      .from("accounts")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, subscriber: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to update subscriber" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const isDemo =
      process.env.NEXT_PUBLIC_DEMO_MODE === "true" &&
      process.env.NEXT_PUBLIC_SUPABASE_URL?.includes("placeholder-project");

    if (isDemo) {
      const idx = MOCK_SUBSCRIBERS.findIndex((s) => s.id === id);
      if (idx !== -1) {
        MOCK_SUBSCRIBERS.splice(idx, 1);
      }
      return NextResponse.json({ success: true, message: "Customer account deleted" });
    }

    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify Super Admin access
    let isDbSuperAdmin = false;
    try {
      const { data: pRole } = await supabase
        .from("profiles")
        .select("role")
        .eq("user_id", user.id)
        .maybeSingle();
      if (pRole?.role === "super_admin") isDbSuperAdmin = true;

      const { data: pAdmin } = await supabase
        .from("profiles")
        .select("is_super_admin")
        .eq("user_id", user.id)
        .maybeSingle();
      if (pAdmin?.is_super_admin) isDbSuperAdmin = true;
    } catch {}

    const adminEmailsRaw = process.env.SUPER_ADMIN_EMAILS || process.env.NEXT_PUBLIC_SUPER_ADMIN_EMAILS || "support@digisolvnet.com";
    const allowedEmails = adminEmailsRaw?.split(",").map((e) => e.trim().toLowerCase()) || [];
    const isSuperAdmin =
      isDbSuperAdmin ||
      (user.email && allowedEmails.includes(user.email.toLowerCase()));

    if (!isSuperAdmin) {
      return NextResponse.json({ error: "Forbidden: Super Admin access required" }, { status: 403 });
    }

    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const dbClient = serviceKey
      ? createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey, {
          auth: { autoRefreshToken: false, persistSession: false },
        })
      : supabase;

    const { error: delError } = await dbClient
      .from("accounts")
      .delete()
      .eq("id", id);

    if (delError) {
      return NextResponse.json({ error: delError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "Customer account deleted successfully" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to delete account" }, { status: 500 });
  }
}
