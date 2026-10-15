import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireRole, toErrorResponse } from "@/lib/auth/account";
import { MOCK_PAYMENT_GATEWAYS, MOCK_ACCOUNT_ID } from "@/lib/mock/data";

export async function GET(request: Request) {
  try {
    const isDemo = process.env.NEXT_PUBLIC_DEMO_MODE === "true";
    const { searchParams } = new URL(request.url);
    const requestedAccountId = searchParams.get("account_id");

    if (isDemo) {
      const gw = MOCK_PAYMENT_GATEWAYS[0];
      return NextResponse.json({
        gateway: gw || null,
        isConfigured: Boolean(gw?.key_id),
      });
    }

    const { accountId, supabase, role } = await requireRole("agent");
    const targetAccountId = role === "owner" || role === "admin" ? (requestedAccountId || accountId) : accountId;

    const { data: gateway, error } = await supabase
      .from("account_payment_gateways")
      .select("*")
      .eq("account_id", targetAccountId)
      .eq("provider", "razorpay")
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Mask secret key on GET for security if viewer/agent
    let safeGateway = gateway ? { ...gateway } : null;
    if (safeGateway && safeGateway.key_secret) {
      const len = safeGateway.key_secret.length;
      safeGateway.key_secret_masked = len > 4 ? `••••••••${safeGateway.key_secret.slice(-4)}` : "••••••••";
    }

    return NextResponse.json({
      gateway: safeGateway,
      isConfigured: Boolean(gateway?.key_id && gateway?.key_secret),
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const isDemo = process.env.NEXT_PUBLIC_DEMO_MODE === "true";
    const body = await request.json();
    const { key_id, key_secret, webhook_secret, is_active = true } = body;

    if (!key_id) {
      return NextResponse.json({ error: "Razorpay Key ID is required" }, { status: 400 });
    }

    if (isDemo) {
      let gw = MOCK_PAYMENT_GATEWAYS.find((g) => g.account_id === MOCK_ACCOUNT_ID);
      if (!gw) {
        gw = {
          id: `gw-${Date.now()}`,
          account_id: MOCK_ACCOUNT_ID,
          provider: "razorpay",
          is_active: Boolean(is_active),
          key_id: key_id.trim(),
          key_secret: (key_secret || "").trim(),
          webhook_secret: (webhook_secret || "").trim(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        MOCK_PAYMENT_GATEWAYS.push(gw);
      } else {
        gw.key_id = key_id.trim();
        if (key_secret && !key_secret.includes("••••")) gw.key_secret = key_secret.trim();
        if (webhook_secret) gw.webhook_secret = webhook_secret.trim();
        gw.is_active = Boolean(is_active);
        gw.updated_at = new Date().toISOString();
      }

      return NextResponse.json({ success: true, gateway: gw });
    }

    const { accountId, supabase } = await requireRole("admin");

    const payload: any = {
      account_id: accountId,
      provider: "razorpay",
      key_id: key_id.trim(),
      is_active: Boolean(is_active),
      updated_at: new Date().toISOString(),
    };

    if (key_secret && !key_secret.includes("••••")) {
      payload.key_secret = key_secret.trim();
    }
    if (webhook_secret) {
      payload.webhook_secret = webhook_secret.trim();
    }

    const { data: saved, error } = await supabase
      .from("account_payment_gateways")
      .upsert(payload, { onConflict: "account_id, provider" })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, gateway: saved });
  } catch (error) {
    return toErrorResponse(error);
  }
}
