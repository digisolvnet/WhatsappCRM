import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { MOCK_SUBSCRIBERS, MOCK_SUBSCRIPTION_PAYMENTS } from "@/lib/mock/data";

export async function GET(request: Request) {
  try {
    const isDemo =
      process.env.NEXT_PUBLIC_DEMO_MODE === "true" &&
      process.env.NEXT_PUBLIC_SUPABASE_URL?.includes("placeholder-project");

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
    let isDbSuperAdmin = false;
    let isOwner = false;
    try {
      const { data: pRole } = await supabase
        .from("profiles")
        .select("role, account_role")
        .eq("user_id", user.id)
        .maybeSingle();
      if (pRole?.role === "super_admin") isDbSuperAdmin = true;
      if (pRole?.account_role === "owner" || pRole?.role === "owner") isOwner = true;

      const { data: pAdmin } = await supabase
        .from("profiles")
        .select("is_super_admin")
        .eq("user_id", user.id)
        .maybeSingle();
      if (pAdmin?.is_super_admin) isDbSuperAdmin = true;
    } catch {
      // Column might not exist yet before migration
    }

    const adminEmailsRaw = process.env.SUPER_ADMIN_EMAILS || process.env.NEXT_PUBLIC_SUPER_ADMIN_EMAILS || "support@digisolvnet.com";
    const allowedEmails = adminEmailsRaw?.split(",").map((e) => e.trim().toLowerCase()) || [];
    const isSuperAdmin =
      isDbSuperAdmin ||
      (user.email && allowedEmails.includes(user.email.toLowerCase()));

    if (!isSuperAdmin) {
      return NextResponse.json({ error: "Forbidden: Super Admin access required" }, { status: 403 });
    }

    // Initialize service client if service key exists so Super Admin can see ALL accounts bypassing RLS!
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const dbClient = serviceKey
      ? createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey, {
          auth: { autoRefreshToken: false, persistSession: false },
        })
      : supabase;

    // Fetch all accounts
    let accounts: any[] = [];
    const { data: accData, error: accountsError } = await dbClient
      .from("accounts")
      .select("*, profiles!profiles_account_id_fkey(full_name, email, role)")
      .order("created_at", { ascending: false });

    if (!accountsError && accData) {
      accounts = accData;
    } else {
      // Fallback query if relationship embed has schema cache issue
      const { data: rawAccs } = await dbClient
        .from("accounts")
        .select("*")
        .order("created_at", { ascending: false });
      accounts = rawAccs || [];
    }

    // Fetch profiles map to guarantee owner details are always present for all accounts
    const accountIds = accounts.map((a: any) => a.id).filter(Boolean);
    let profilesByAccount: Record<string, any> = {};
    if (accountIds.length > 0) {
      try {
        const { data: profs } = await dbClient
          .from("profiles")
          .select("account_id, full_name, email, role")
          .in("account_id", accountIds);
        (profs || []).forEach((p: any) => {
          if (p.account_id && (!profilesByAccount[p.account_id] || p.role === "owner")) {
            profilesByAccount[p.account_id] = p;
          }
        });
      } catch {}
    }

    const subscribers = (accounts || []).map((acc: any) => {
      let owner = Array.isArray(acc.profiles)
        ? acc.profiles.find((p: any) => p.role === "owner") || acc.profiles[0]
        : null;

      if (!owner && profilesByAccount[acc.id]) {
        owner = profilesByAccount[acc.id];
      }

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

export async function POST(request: Request) {
  try {
    const isDemo =
      process.env.NEXT_PUBLIC_DEMO_MODE === "true" &&
      process.env.NEXT_PUBLIC_SUPABASE_URL?.includes("placeholder-project");
    const body = await request.json();
    const {
      name,
      owner_name,
      owner_email,
      password,
      billing_phone,
      plan_name,
      monthly_price,
      currency,
      subscription_status,
      duration_days,
      payment_link,
      notes,
    } = body;

    if (!name || !owner_email) {
      return NextResponse.json(
        { error: "Customer/Business name and login email are required" },
        { status: 400 }
      );
    }

    const duration = Number(duration_days || 30);
    const expiryDate = new Date(Date.now() + duration * 24 * 3600 * 1000).toISOString();
    const price = Number(monthly_price || 999);
    const curr = currency || "INR";
    const status = subscription_status || "active";
    const phone = billing_phone || "";
    const clientPassword = password || "Client@123";

    if (isDemo) {
      const newSub = {
        id: `acc_${Date.now()}`,
        name,
        owner_name: owner_name || "Customer Owner",
        owner_email,
        billing_phone: phone,
        subscription_status: status,
        plan_name: plan_name || "Monthly Pro",
        monthly_price: price,
        currency: curr,
        current_period_start: new Date().toISOString(),
        current_period_ends_at: expiryDate,
        payment_link: payment_link || "",
        auto_reminder_enabled: true,
        reminder_count: 0,
        notes: notes || "",
        created_at: new Date().toISOString(),
      };
      MOCK_SUBSCRIBERS.unshift(newSub);

      if (status === "active") {
        MOCK_SUBSCRIPTION_PAYMENTS.unshift({
          id: `pay_${Date.now()}`,
          account_id: newSub.id,
          account_name: name,
          amount: price,
          currency: curr,
          status: "completed",
          payment_method: "manual",
          reference_id: `init_${Date.now()}`,
          period_start: newSub.current_period_start,
          period_end: expiryDate,
          notes: "Initial subscription created by Super Admin",
          created_at: new Date().toISOString(),
        });
      }

      return NextResponse.json({
        success: true,
        message: "Customer account created successfully!",
        subscriber: newSub,
        credentials: {
          email: owner_email,
          password: clientPassword,
        },
      });
    }

    // Live Supabase
    const supabase = await createClient();
    const {
      data: { user: currentUser },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify Super Admin access
    let isDbSuperAdmin = false;
    try {
      const { data: pRole } = await supabase
        .from("profiles")
        .select("role")
        .eq("user_id", currentUser.id)
        .maybeSingle();
      if (pRole?.role === "super_admin") isDbSuperAdmin = true;

      const { data: pAdmin } = await supabase
        .from("profiles")
        .select("is_super_admin")
        .eq("user_id", currentUser.id)
        .maybeSingle();
      if (pAdmin?.is_super_admin) isDbSuperAdmin = true;
    } catch {}

    const adminEmailsRaw = process.env.SUPER_ADMIN_EMAILS || process.env.NEXT_PUBLIC_SUPER_ADMIN_EMAILS || "support@digisolvnet.com";
    const allowedEmails = adminEmailsRaw?.split(",").map((e) => e.trim().toLowerCase()) || [];
    const isSuperAdmin =
      isDbSuperAdmin ||
      (currentUser.email && allowedEmails.includes(currentUser.email.toLowerCase()));

    if (!isSuperAdmin) {
      return NextResponse.json({ error: "Forbidden: Super Admin access required" }, { status: 403 });
    }

    // Initialize service client if service key exists
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const adminSupabase = serviceKey
      ? createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey, {
          auth: { autoRefreshToken: false, persistSession: false },
        })
      : null;

    let createdAuthUserId: string | null = null;

    if (adminSupabase) {
      try {
        const { data: authUser, error: createAuthError } = await adminSupabase.auth.admin.createUser({
          email: owner_email,
          password: clientPassword,
          email_confirm: true,
          user_metadata: { full_name: owner_name || name },
        });

        if (authUser?.user?.id) {
          createdAuthUserId = authUser.user.id;
        } else if (
          createAuthError?.message?.includes("already registered") ||
          createAuthError?.message?.includes("already been registered")
        ) {
          const { data: existingProfile } = await supabase
            .from("profiles")
            .select("user_id")
            .eq("email", owner_email)
            .maybeSingle();
          if (existingProfile?.user_id) {
            createdAuthUserId = existingProfile.user_id;
          }
        }
      } catch (err: any) {
        console.warn("[Admin Create Customer] Auth create warning:", err.message);
      }
    }

    // Insert new account record
    const dbClient = adminSupabase || supabase;
    const { data: newAccount, error: accError } = await dbClient
      .from("accounts")
      .insert({
        name,
        plan_name: plan_name || "Monthly Pro",
        monthly_price: price,
        currency: curr,
        subscription_status: status,
        current_period_start: new Date().toISOString(),
        current_period_ends_at: expiryDate,
        billing_phone: phone,
        billing_email: owner_email,
        payment_link: payment_link || "",
        notes: notes || "",
        auto_reminder_enabled: true,
      })
      .select()
      .single();

    if (accError) {
      return NextResponse.json({ error: accError.message }, { status: 500 });
    }

    // Link profile to this account if user exists
    if (createdAuthUserId) {
      try {
        await dbClient
          .from("profiles")
          .update({
            account_id: newAccount.id,
            account_role: "owner",
            role: "owner",
            full_name: owner_name || name,
          })
          .eq("user_id", createdAuthUserId);
      } catch (profErr: any) {
        console.warn("[Admin Create Customer] Profile link warning:", profErr.message);
      }
    }

    // Record initial payment in subscription_payments if status is active
    if (status === "active") {
      try {
        await dbClient.from("subscription_payments").insert({
          account_id: newAccount.id,
          amount: price,
          currency: curr,
          status: "completed",
          payment_method: "manual",
          reference_id: `init_${Date.now()}`,
          period_start: new Date().toISOString(),
          period_end: expiryDate,
          notes: `Initial subscription created by Super Admin (${currentUser.email})`,
        });
      } catch {}
    }

    return NextResponse.json({
      success: true,
      message: "Customer created and subscription activated successfully!",
      subscriber: {
        id: newAccount.id,
        name: newAccount.name,
        owner_name: owner_name || "Customer Owner",
        owner_email,
        billing_phone: phone,
        subscription_status: newAccount.subscription_status || status,
        plan_name: newAccount.plan_name || plan_name || "Monthly Pro",
        monthly_price: price,
        currency: curr,
        current_period_start: newAccount.current_period_start,
        current_period_ends_at: newAccount.current_period_ends_at || expiryDate,
        payment_link: newAccount.payment_link || "",
        auto_reminder_enabled: true,
        reminder_count: 0,
        notes: newAccount.notes || "",
        created_at: newAccount.created_at || new Date().toISOString(),
      },
      credentials: {
        email: owner_email,
        password: clientPassword,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to create customer" },
      { status: 500 }
    );
  }
}
