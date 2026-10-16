import { NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { MOCK_SUBSCRIBERS } from "@/lib/mock/data";

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get("x-master-admin-token") || request.headers.get("authorization");
    const expectedSecret = process.env.REMOTE_SYNC_SECRET || "digisolvnet_master_sync_2026";

    // Validate Master Admin secret
    const token = authHeader?.replace(/^Bearer\s+/i, "");
    if (!token || (token !== expectedSecret && token !== process.env.CRON_SECRET)) {
      return NextResponse.json(
        { error: "Unauthorized: Invalid Master Admin Sync Token" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      action,
      account_id,
      subscription_status,
      current_period_ends_at,
      plan_name,
      notes,
      renew_days,
    } = body;

    const targetStatus =
      subscription_status ||
      (action === "suspend" ? "suspended" : action === "activate" ? "active" : "active");

    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const isPlaceholder = !supabaseUrl || supabaseUrl.includes("placeholder-project");

    if (isPlaceholder || !serviceKey) {
      // Demo / in-memory mode
      MOCK_SUBSCRIBERS.forEach((sub) => {
        if (!account_id || sub.id === account_id) {
          sub.subscription_status = targetStatus as any;
          if (current_period_ends_at) sub.current_period_ends_at = current_period_ends_at;
          if (plan_name) sub.plan_name = plan_name;
          if (notes) sub.notes = notes;
        }
      });
      return NextResponse.json({
        success: true,
        message: `Remote control action '${action}' applied in Demo Mode. Status: ${targetStatus}`,
        updated_status: targetStatus,
      });
    }

    // Live Supabase database
    const adminClient = createSupabaseClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const updates: Record<string, any> = {
      subscription_status: targetStatus,
      updated_at: new Date().toISOString(),
    };

    if (current_period_ends_at) {
      updates.current_period_ends_at = current_period_ends_at;
    } else if (action === "renew" && renew_days) {
      const endsAt = new Date(Date.now() + Number(renew_days) * 24 * 3600 * 1000).toISOString();
      updates.current_period_ends_at = endsAt;
    }

    if (plan_name) updates.plan_name = plan_name;
    if (notes) updates.notes = notes;

    let query = adminClient.from("accounts").update(updates);
    if (account_id) {
      query = query.eq("id", account_id);
    }

    const { data, error } = await query.select();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: `Remote control action '${action}' applied successfully to ${data?.length || 0} account(s).`,
      updated_status: targetStatus,
      updated_accounts: data?.length || 0,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to execute remote control command" },
      { status: 500 }
    );
  }
}
