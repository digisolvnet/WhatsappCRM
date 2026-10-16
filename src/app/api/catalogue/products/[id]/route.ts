import { NextResponse } from "next/server";
import { getCurrentAccount } from "@/lib/auth/account";
import { createClient } from "@/lib/supabase/server";
import { isDemoMode } from "@/lib/mock/data";
import { MOCK_TENANT_PRODUCTS, MOCK_ACCOUNT_ID } from "@/lib/mock/data";
import { validateProductPayload } from "@/lib/catalogue/validation";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const isDemo = isDemoMode();
    let accountId = MOCK_ACCOUNT_ID;

    if (!isDemo) {
      const accountCtx = await getCurrentAccount();
      if (!accountCtx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      accountId = accountCtx.accountId;
    }

    if (isDemo) {
      const product = MOCK_TENANT_PRODUCTS.find((p) => p.id === id && p.account_id === accountId);
      if (!product) return NextResponse.json({ error: "Product not found" }, { status: 404 });
      return NextResponse.json({ product });
    }

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("tenant_products")
      .select("*")
      .eq("id", id)
      .eq("account_id", accountId)
      .maybeSingle();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!data) return NextResponse.json({ error: "Product not found" }, { status: 404 });

    return NextResponse.json({ product: data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to fetch product" }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const isDemo = isDemoMode();
    let accountId = MOCK_ACCOUNT_ID;

    if (!isDemo) {
      const accountCtx = await getCurrentAccount();
      if (!accountCtx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      accountId = accountCtx.accountId;
    }

    if (isDemo) {
      const idx = MOCK_TENANT_PRODUCTS.findIndex((p) => p.id === id && p.account_id === accountId);
      if (idx === -1) return NextResponse.json({ error: "Product not found" }, { status: 404 });

      const updated = {
        ...MOCK_TENANT_PRODUCTS[idx],
        ...body,
        updated_at: new Date().toISOString(),
      };
      MOCK_TENANT_PRODUCTS[idx] = updated;
      return NextResponse.json({ product: updated });
    }

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("tenant_products")
      .update({
        ...body,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("account_id", accountId)
      .select()
      .maybeSingle();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!data) return NextResponse.json({ error: "Product not found" }, { status: 404 });

    return NextResponse.json({ product: data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to update product" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const isDemo = isDemoMode();
    let accountId = MOCK_ACCOUNT_ID;

    if (!isDemo) {
      const accountCtx = await getCurrentAccount();
      if (!accountCtx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      accountId = accountCtx.accountId;
    }

    if (isDemo) {
      const idx = MOCK_TENANT_PRODUCTS.findIndex((p) => p.id === id && p.account_id === accountId);
      if (idx === -1) return NextResponse.json({ error: "Product not found" }, { status: 404 });
      MOCK_TENANT_PRODUCTS[idx].status = "archived";
      return NextResponse.json({ success: true, archived: true });
    }

    const supabase = await createClient();
    // Soft archive by setting status to archived
    const { error } = await supabase
      .from("tenant_products")
      .update({ status: "archived", updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("account_id", accountId);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true, archived: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to archive product" }, { status: 500 });
  }
}
