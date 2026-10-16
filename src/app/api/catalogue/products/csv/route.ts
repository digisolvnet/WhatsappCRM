import { NextResponse } from "next/server";
import { getCurrentAccount } from "@/lib/auth/account";
import { createClient } from "@/lib/supabase/server";
import { isDemoMode } from "@/lib/mock/client";
import { MOCK_TENANT_PRODUCTS, MOCK_ACCOUNT_ID } from "@/lib/mock/data";
import { exportProductsToCsv, parseAndValidateProductCsv } from "@/lib/catalogue/csv";

export async function GET(request: Request) {
  try {
    const isDemo = isDemoMode();
    let accountId = MOCK_ACCOUNT_ID;

    if (!isDemo) {
      const accountCtx = await getCurrentAccount();
      if (!accountCtx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      accountId = accountCtx.accountId;
    }

    let products: any[] = [];
    if (isDemo) {
      products = MOCK_TENANT_PRODUCTS.filter((p) => p.account_id === accountId);
    } else {
      const supabase = await createClient();
      const { data, error } = await supabase
        .from("tenant_products")
        .select("*")
        .eq("account_id", accountId)
        .order("created_at", { ascending: false });

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      products = data || [];
    }

    const csvContent = exportProductsToCsv(products);

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="catalogue-export-${Date.now()}.csv"`,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to export CSV" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const isDemo = isDemoMode();
    let accountId = MOCK_ACCOUNT_ID;

    if (!isDemo) {
      const accountCtx = await getCurrentAccount();
      if (!accountCtx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      accountId = accountCtx.accountId;
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    let csvText = "";

    if (file) {
      csvText = await file.text();
    } else {
      const body = await request.json().catch(() => null);
      if (body?.csvText) {
        csvText = body.csvText;
      }
    }

    if (!csvText || !csvText.trim()) {
      return NextResponse.json({ error: "CSV content or file is required" }, { status: 400 });
    }

    // Collect existing tenant SKUs for duplicate checking
    const existingSkus = new Set<string>();
    if (isDemo) {
      MOCK_TENANT_PRODUCTS.filter((p) => p.account_id === accountId).forEach((p) => {
        existingSkus.add(p.sku.toUpperCase());
      });
    } else {
      const supabase = await createClient();
      const { data: existingRows } = await supabase
        .from("tenant_products")
        .select("sku")
        .eq("account_id", accountId);
      (existingRows || []).forEach((r) => existingSkus.add(r.sku.toUpperCase()));
    }

    const parseResult = parseAndValidateProductCsv(csvText, existingSkus);

    // If there are duplicate SKUs or no valid rows, return report
    if (parseResult.validRows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "No valid product rows found to import",
          ...parseResult,
        },
        { status: 422 }
      );
    }

    // Insert valid rows into database or mock
    const insertedProducts: any[] = [];
    if (isDemo) {
      for (const row of parseResult.validRows) {
        const item = {
          id: `prod_csv_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          account_id: accountId,
          ...row,
          images: [],
          status: "active",
          variants: [],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        MOCK_TENANT_PRODUCTS.unshift(item);
        insertedProducts.push(item);
      }
    } else {
      const supabase = await createClient();
      const dbRows = parseResult.validRows.map((r) => ({
        account_id: accountId,
        ...r,
        images: [],
        status: "active",
        variants: [],
      }));

      const { data, error } = await supabase.from("tenant_products").insert(dbRows).select();
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      insertedProducts.push(...(data || []));
    }

    return NextResponse.json({
      success: true,
      importedCount: insertedProducts.length,
      skippedErrorsCount: parseResult.errors.length,
      errors: parseResult.errors,
      duplicateSkus: parseResult.duplicateSkus,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to process CSV import" }, { status: 500 });
  }
}
