import { NextResponse } from "next/server";
import { getCurrentAccount } from "@/lib/auth/account";
import { createClient } from "@/lib/supabase/server";
import { isDemoMode } from "@/lib/mock/data";
import { MOCK_TENANT_PRODUCTS, MOCK_ACCOUNT_ID } from "@/lib/mock/data";
import { validateProductPayload, sanitizeSku } from "@/lib/catalogue/validation";
import { assertTenantScope, sanitizeTenantPayload } from "@/lib/auth/tenant-guard";

export async function GET(request: Request) {
  try {
    const isDemo = isDemoMode();
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search")?.toLowerCase();
    const category = searchParams.get("category");
    const itemType = searchParams.get("item_type");
    const status = searchParams.get("status") || "active";

    let accountId = MOCK_ACCOUNT_ID;

    if (!isDemo) {
      const accountCtx = await getCurrentAccount();
      if (!accountCtx) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      accountId = accountCtx.accountId;
    }

    if (isDemo) {
      let products = MOCK_TENANT_PRODUCTS.filter((p) => p.account_id === accountId);
      if (status !== "all") {
        products = products.filter((p) => p.status === status);
      }
      if (itemType) {
        products = products.filter((p) => p.item_type === itemType);
      }
      if (category) {
        products = products.filter((p) => p.category.toLowerCase() === category.toLowerCase());
      }
      if (search) {
        products = products.filter(
          (p) =>
            p.name.toLowerCase().includes(search) ||
            p.sku.toLowerCase().includes(search) ||
            (p.description && p.description.toLowerCase().includes(search))
        );
      }
      return NextResponse.json({ products, count: products.length });
    }

    const supabase = await createClient();
    let query = supabase
      .from("tenant_products")
      .select("*")
      .eq("account_id", accountId);

    if (status !== "all") {
      query = query.eq("status", status);
    }
    if (itemType) {
      query = query.eq("item_type", itemType);
    }
    if (category) {
      query = query.eq("category", category);
    }
    if (search) {
      query = query.or(`name.ilike.%${search}%,sku.ilike.%${search}%,description.ilike.%${search}%`);
    }

    query = query.order("created_at", { ascending: false });
    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ products: data || [], count: (data || []).length });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to fetch products" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const isDemo = isDemoMode();
    const body = await request.json();

    let accountId = MOCK_ACCOUNT_ID;
    if (!isDemo) {
      const accountCtx = await getCurrentAccount();
      if (!accountCtx) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      accountId = accountCtx.accountId;
      assertTenantScope(body.account_id, accountCtx);
    }

    const validated = validateProductPayload(body);

    if (isDemo) {
      // Check SKU uniqueness in mock data for this tenant
      const existing = MOCK_TENANT_PRODUCTS.find(
        (p) => p.account_id === accountId && p.sku.toUpperCase() === validated.sku.toUpperCase()
      );
      if (existing) {
        return NextResponse.json(
          { error: `Product SKU '${validated.sku}' already exists for this tenant` },
          { status: 409 }
        );
      }

      const newProduct = {
        id: `prod_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        account_id: accountId,
        ...validated,
        status: "active",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      MOCK_TENANT_PRODUCTS.unshift(newProduct);
      return NextResponse.json({ product: newProduct }, { status: 201 });
    }

    const supabase = await createClient();
    const payload = sanitizeTenantPayload(
      {
        ...validated,
        status: "active",
      },
      accountId
    );

    const { data, error } = await supabase
      .from("tenant_products")
      .insert(payload)
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          { error: `Product with SKU '${validated.sku}' already exists` },
          { status: 409 }
        );
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ product: data }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to create product" },
      { status: err.status || 400 }
    );
  }
}
