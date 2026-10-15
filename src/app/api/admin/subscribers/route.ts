import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { MOCK_SUBSCRIBERS } from "@/lib/mock/data";

export async function GET(request: Request) {
  try {
    const isDemo = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

    if (isDemo) {
      // Calculate SaaS MRR and stats from mock subscribers
      const totalTenants = MOCK_SUBSCRIBERS.length;
      const activeTenants = MOCK_SUBSCRIBERS.filter((s) => s.subscription_status === "active").length;
      const pastDueTenants = MOCK_SUBSCRIBERS.filter((s) => s.subscription_status === "past_due" || s.subscription_status === "suspended").length;
      const now = new Date();
      const in7Days = new Date(now.getTime() + 7 * 24 * 3600 * 1000);
      const expiringSoon = MOCK_SUBSCRIBERS.filter((s) => {
        const expiry = new Date(s.current_period_ends_at);
        return s.subscription_status === "active" && expiry <= in7Days && expiry >= now;
      }).length;
      const mrr = MOCK_SUBSCRIBERS.filter((s) => s.subscription_status === "active").reduce(
        (sum, s) => sum + Number(s.monthly_price || 0),
        0
      );

      return NextResponse.json({
        subscribers: MOCK_SUBSCRIBERS,
        stats: {
          totalTenants,
          activeTenants,
          pastDueTenants,
          expiringSoon,
          mrr,
        },
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

    // Verify Super Admin access
    const { data: profile } = await supabase
      .from("profiles")
      .select("is_super_admin, role")
      .eq("user_id", user.id)
      .single();

    const adminEmailsRaw = process.env.SUPER_ADMIN_EMAILS || process.env.NEXT_PUBLIC_SUPER_ADMIN_EMAILS;
    const allowedEmails = adminEmailsRaw?.split(",").map((e) => e.trim().toLowerCase()) || [];
    const isSuperAdmin =
      profile?.is_super_admin ||
      profile?.role === "super_admin" ||
      (user.email && allowedEmails.includes(user.email.toLowerCase()));

    if (!isSuperAdmin) {
      return NextResponse.json({ error: "Forbidden: Super Admin access required" }, { status: 403 });
    }

    // Fetch all accounts
    const { data: accounts, error: accountsError } = await supabase
      .from("accounts")
      .select("*, profiles!profiles_account_id_fkey(full_name, email, role)")
      .order("created_at", { ascending: false });

    if (accountsError) {
      return NextResponse.json({ error: accountsError.message }, { status: 500 });
    }

    const subscribers = (accounts || []).map((acc: any) => {
      const owner = Array.isArray(acc.profiles)
        ? acc.profiles.find((p: any) => p.role === "owner") || acc.profiles[0]
        : null;

      return {
        id: acc.id,
        name: acc.name,
        owner_name: owner?.full_name || "Admin",
        owner_email: acc.billing_email || owner?.email || "No email",
        billing_phone: acc.billing_phone || "",
        subscription_status: acc.subscription_status || "trial",
        plan_name: acc.plan_name || "Monthly Pro",
        monthly_price: Number(acc.monthly_price || 49),
        currency: acc.currency || "USD",
        current_period_start: acc.current_period_start,
        current_period_ends_at: acc.current_period_ends_at,
        payment_link: acc.payment_link || "",
        auto_reminder_enabled: acc.auto_reminder_enabled !== false,
        last_reminder_sent_at: acc.last_reminder_sent_at,
        reminder_count: acc.reminder_count || 0,
        notes: acc.notes || "",
        created_at: acc.created_at,
      };
    });

    const now = new Date();
    const in7Days = new Date(now.getTime() + 7 * 24 * 3600 * 1000);
    const active = subscribers.filter((s: any) => s.subscription_status === "active");

    const stats = {
      totalTenants: subscribers.length,
      activeTenants: active.length,
      pastDueTenants: subscribers.filter((s: any) => s.subscription_status === "past_due" || s.subscription_status === "suspended").length,
      expiringSoon: active.filter((s: any) => {
        const expiry = new Date(s.current_period_ends_at);
        return expiry <= in7Days && expiry >= now;
      }).length,
      mrr: active.reduce((sum: number, s: any) => sum + s.monthly_price, 0),
    };

    return NextResponse.json({ subscribers, stats });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to load subscribers" }, { status: 500 });
  }
}
