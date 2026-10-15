import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { MOCK_PLATFORM_SETTINGS } from "@/lib/mock/data";

export async function GET() {
  try {
    const isDemo = process.env.NEXT_PUBLIC_DEMO_MODE === "true";
    if (isDemo) {
      return NextResponse.json({ settings: MOCK_PLATFORM_SETTINGS });
    }

    const supabase = await createClient();
    const { data: settings } = await supabase
      .from("platform_billing_settings")
      .select("*")
      .eq("id", "default")
      .single();

    return NextResponse.json({ settings: settings || MOCK_PLATFORM_SETTINGS });
  } catch (error: any) {
    return NextResponse.json({ settings: MOCK_PLATFORM_SETTINGS });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const isDemo = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

    const {
      default_monthly_price,
      default_currency,
      default_trial_days,
      default_payment_link,
      super_admin_whatsapp,
      reminder_days_before,
      reminder_message_template,
    } = body;

    if (isDemo) {
      if (default_monthly_price !== undefined) MOCK_PLATFORM_SETTINGS.default_monthly_price = Number(default_monthly_price);
      if (default_currency !== undefined) MOCK_PLATFORM_SETTINGS.default_currency = default_currency;
      if (default_trial_days !== undefined) MOCK_PLATFORM_SETTINGS.default_trial_days = Number(default_trial_days);
      if (default_payment_link !== undefined) MOCK_PLATFORM_SETTINGS.default_payment_link = default_payment_link;
      if (super_admin_whatsapp !== undefined) MOCK_PLATFORM_SETTINGS.super_admin_whatsapp = super_admin_whatsapp;
      if (reminder_days_before !== undefined) MOCK_PLATFORM_SETTINGS.reminder_days_before = reminder_days_before;
      if (reminder_message_template !== undefined) MOCK_PLATFORM_SETTINGS.reminder_message_template = reminder_message_template;
      MOCK_PLATFORM_SETTINGS.updated_at = new Date().toISOString();

      return NextResponse.json({ success: true, settings: MOCK_PLATFORM_SETTINGS });
    }

    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const updates = {
      default_monthly_price: Number(default_monthly_price || 49),
      default_currency: default_currency || "USD",
      default_trial_days: Number(default_trial_days || 7),
      default_payment_link: default_payment_link || "",
      super_admin_whatsapp: super_admin_whatsapp || "",
      reminder_days_before: reminder_days_before || [3, 1, 0],
      reminder_message_template: reminder_message_template || MOCK_PLATFORM_SETTINGS.reminder_message_template,
      updated_at: new Date().toISOString(),
    };

    const { data: saved, error: saveError } = await supabase
      .from("platform_billing_settings")
      .upsert({ id: "default", ...updates })
      .select()
      .single();

    if (saveError) {
      return NextResponse.json({ error: saveError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, settings: saved });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to save settings" }, { status: 500 });
  }
}
