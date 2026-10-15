import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { DEFAULT_CURRENCY } from "@/lib/currency";

export async function POST() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();

    if (authErr || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const db = serviceKey
      ? createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey, {
          auth: { autoRefreshToken: false, persistSession: false },
        })
      : supabase;

    const email = user.email || "";
    const isSuperAdminEmail =
      email.toLowerCase() === "support@digisolvnet.com" ||
      (process.env.SUPER_ADMIN_EMAILS || "")
        .split(",")
        .map((e) => e.trim().toLowerCase())
        .includes(email.toLowerCase());

    // 1. Check existing profile
    let { data: profile } = await db
      .from("profiles")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    // 2. Find or create account
    let accountId = profile?.account_id;
    let accountRow: any = null;

    if (accountId) {
      const { data: acc } = await db
        .from("accounts")
        .select("id, name, default_currency")
        .eq("id", accountId)
        .maybeSingle();
      accountRow = acc;
    }

    if (!accountRow) {
      // Find account by owner_user_id or billing_email
      const { data: existingAcc } = await db
        .from("accounts")
        .select("id, name, default_currency")
        .or(`owner_user_id.eq.${user.id},billing_email.eq.${email}`)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existingAcc) {
        accountRow = existingAcc;
        accountId = existingAcc.id;
      } else {
        // Create new account
        const accName =
          (user.user_metadata?.full_name as string) ||
          email.split("@")[0] ||
          "My Workspace";
        const { data: newAcc } = await db
          .from("accounts")
          .insert({
            name: accName,
            owner_user_id: user.id,
            billing_email: email,
            subscription_status: "active",
            plan_name: "Monthly Pro",
          })
          .select("id, name, default_currency")
          .single();
        accountRow = newAcc;
        accountId = newAcc?.id;
      }
    }

    // 3. Upsert profile
    const fullName =
      (user.user_metadata?.full_name as string) ||
      profile?.full_name ||
      email.split("@")[0] ||
      "Admin";

    const profilePayload: Record<string, any> = {
      user_id: user.id,
      email,
      full_name: fullName,
      account_id: accountId,
      account_role: "owner",
      role: isSuperAdminEmail ? "super_admin" : "owner",
      is_super_admin: isSuperAdminEmail,
    };

    const { data: savedProfile, error: profErr } = await db
      .from("profiles")
      .upsert(profilePayload, { onConflict: "user_id" })
      .select()
      .single();

    if (profErr) {
      console.error("[Account Bootstrap] Profile upsert error:", profErr.message);
    }

    return NextResponse.json({
      success: true,
      profile: savedProfile || profilePayload,
      account: accountRow
        ? {
            id: accountRow.id,
            name: accountRow.name,
            default_currency: accountRow.default_currency || DEFAULT_CURRENCY,
          }
        : null,
    });
  } catch (err: any) {
    console.error("[Account Bootstrap] Error:", err.message);
    return NextResponse.json(
      { error: err.message || "Failed to bootstrap profile" },
      { status: 500 }
    );
  }
}
