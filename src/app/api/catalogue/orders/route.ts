import { NextResponse } from "next/server";
import { getCurrentAccount } from "@/lib/auth/account";
import { createClient } from "@/lib/supabase/server";
import { isDemoMode } from "@/lib/mock/client";
import {
  MOCK_TENANT_ORDERS,
  MOCK_TENANT_PRODUCTS,
  MOCK_CATALOGUE_SETTINGS,
  MOCK_ACCOUNT_ID,
} from "@/lib/mock/data";
import { validateOrderPayload } from "@/lib/catalogue/validation";
import {
  generateOrderReference,
  calculateOrderTotals,
  renderOrderConfirmationMessage,
} from "@/lib/catalogue/order-engine";
import { checkItemStock, deductProductStock } from "@/lib/catalogue/inventory";
import { assertTenantScope, sanitizeTenantPayload } from "@/lib/auth/tenant-guard";

export async function GET(request: Request) {
  try {
    const isDemo = isDemoMode();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const paymentStatus = searchParams.get("payment_status");
    const search = searchParams.get("search")?.toLowerCase();

    let accountId = MOCK_ACCOUNT_ID;
    if (!isDemo) {
      const accountCtx = await getCurrentAccount();
      if (!accountCtx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      accountId = accountCtx.accountId;
    }

    if (isDemo) {
      let orders = MOCK_TENANT_ORDERS.filter((o) => o.account_id === accountId);
      if (status && status !== "all") {
        orders = orders.filter((o) => o.status === status);
      }
      if (paymentStatus && paymentStatus !== "all") {
        orders = orders.filter((o) => o.payment_status === paymentStatus);
      }
      if (search) {
        orders = orders.filter(
          (o) =>
            o.order_reference.toLowerCase().includes(search) ||
            o.customer_name.toLowerCase().includes(search) ||
            o.customer_phone.includes(search)
        );
      }
      return NextResponse.json({ orders, count: orders.length });
    }

    const supabase = await createClient();
    let query = supabase
      .from("tenant_orders")
      .select("*, items:tenant_order_items(*)")
      .eq("account_id", accountId);

    if (status && status !== "all") query = query.eq("status", status);
    if (paymentStatus && paymentStatus !== "all") query = query.eq("payment_status", paymentStatus);
    if (search) {
      query = query.or(`order_reference.ilike.%${search}%,customer_name.ilike.%${search}%,customer_phone.ilike.%${search}%`);
    }

    query = query.order("created_at", { ascending: false });
    const { data, error } = await query;

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ orders: data || [], count: (data || []).length });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to fetch orders" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const isDemo = isDemoMode();
    const body = await request.json();

    let accountId = MOCK_ACCOUNT_ID;
    if (!isDemo) {
      const accountCtx = await getCurrentAccount();
      if (!accountCtx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      accountId = accountCtx.accountId;
      assertTenantScope(body.account_id, accountCtx);
    }

    const validated = validateOrderPayload(body);
    const orderReference = generateOrderReference();

    // Check stock for items if they correspond to known products
    let hasProduct = false;
    let hasService = false;

    for (const item of validated.items) {
      if (item.item_type === "service") {
        hasService = true;
      } else {
        hasProduct = true;
      }

      // If product_id is provided, check stock
      if (item.product_id && item.item_type === "product") {
        if (isDemo) {
          const prod = MOCK_TENANT_PRODUCTS.find(
            (p) => p.id === item.product_id && p.account_id === accountId
          );
          if (prod) {
            checkItemStock(prod, item.quantity, false);
            // Deduct stock in demo
            deductProductStock(prod, item.quantity, false);
          }
        }
      }
    }

    const orderType: "product" | "service" | "mixed" =
      hasProduct && hasService ? "mixed" : hasService ? "service" : "product";

    const { subtotal, taxAmount, total } = calculateOrderTotals(validated.items, "INR");

    if (isDemo) {
      const newOrder = {
        id: `ord_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        account_id: accountId,
        order_reference: orderReference,
        customer_name: validated.customer_name,
        customer_phone: validated.customer_phone,
        customer_email: validated.customer_email || null,
        order_type: orderType,
        status: "pending",
        payment_status: "unpaid",
        fulfilment_status: "unfulfilled",
        currency: "INR",
        subtotal_amount: subtotal,
        tax_amount: taxAmount,
        total_amount: total,
        notes: validated.notes || null,
        items: validated.items.map((item, idx) => ({
          id: `item_${Date.now()}_${idx}`,
          order_id: `ord_demo`,
          account_id: accountId,
          ...item,
          total_price: Math.round(item.unit_price * item.quantity * 100) / 100,
        })),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      MOCK_TENANT_ORDERS.unshift(newOrder);

      const confirmationMsg = renderOrderConfirmationMessage(
        newOrder as any,
        MOCK_CATALOGUE_SETTINGS.order_confirmation_template
      );

      return NextResponse.json(
        {
          order: newOrder,
          whatsappConfirmationMessage: confirmationMsg,
        },
        { status: 201 }
      );
    }

    // Production mode with Supabase
    const supabase = await createClient();

    // Insert order record
    const { data: orderData, error: orderError } = await supabase
      .from("tenant_orders")
      .insert(
        sanitizeTenantPayload(
          {
            order_reference: orderReference,
            customer_name: validated.customer_name,
            customer_phone: validated.customer_phone,
            customer_email: validated.customer_email,
            order_type: orderType,
            status: "pending",
            payment_status: "unpaid",
            fulfilment_status: "unfulfilled",
            currency: "INR",
            subtotal_amount: subtotal,
            tax_amount: taxAmount,
            total_amount: total,
            notes: validated.notes,
          },
          accountId
        )
      )
      .select()
      .single();

    if (orderError) {
      return NextResponse.json({ error: orderError.message }, { status: 500 });
    }

    // Insert order items
    const orderItemsToInsert = validated.items.map((item) => ({
      order_id: orderData.id,
      account_id: accountId,
      product_id: item.product_id,
      item_type: item.item_type,
      item_name: item.item_name,
      sku: item.sku,
      variant_id: item.variant_id,
      unit_price: item.unit_price,
      quantity: item.quantity,
      total_price: Math.round(item.unit_price * item.quantity * 100) / 100,
      service_scheduled_at: item.service_scheduled_at,
    }));

    const { error: itemsError } = await supabase
      .from("tenant_order_items")
      .insert(orderItemsToInsert);

    if (itemsError) {
      return NextResponse.json({ error: itemsError.message }, { status: 500 });
    }

    // Stock deduction for products with inventory tracking
    for (const item of validated.items) {
      if (item.product_id && item.item_type === "product") {
        const { data: p } = await supabase
          .from("tenant_products")
          .select("stock_quantity, track_inventory")
          .eq("id", item.product_id)
          .single();

        if (p && p.track_inventory) {
          const newStock = Math.max(0, p.stock_quantity - item.quantity);
          await supabase
            .from("tenant_products")
            .update({ stock_quantity: newStock, updated_at: new Date().toISOString() })
            .eq("id", item.product_id);
        }
      }
    }

    // Fetch settings for confirmation message
    const { data: settings } = await supabase
      .from("tenant_catalogue_settings")
      .select("*")
      .eq("account_id", accountId)
      .maybeSingle();

    const confirmationMsg = renderOrderConfirmationMessage(
      { ...orderData, items: orderItemsToInsert },
      settings?.order_confirmation_template
    );

    return NextResponse.json(
      {
        order: { ...orderData, items: orderItemsToInsert },
        whatsappConfirmationMessage: confirmationMsg,
      },
      { status: 201 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to create order" },
      { status: err.status || 400 }
    );
  }
}
