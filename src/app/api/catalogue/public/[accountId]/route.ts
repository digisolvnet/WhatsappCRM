import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isDemoMode } from "@/lib/mock/data";
import {
  MOCK_TENANT_PRODUCTS,
  MOCK_TENANT_ORDERS,
  MOCK_CATALOGUE_SETTINGS,
  MOCK_ACCOUNT_ID,
} from "@/lib/mock/data";
import { validateOrderPayload } from "@/lib/catalogue/validation";
import {
  generateOrderReference,
  calculateOrderTotals,
  renderOrderConfirmationMessage,
} from "@/lib/catalogue/order-engine";
import { checkItemStock } from "@/lib/catalogue/inventory";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ accountId: string }> }
) {
  try {
    const { accountId } = await params;
    const isDemo = isDemoMode();

    if (isDemo) {
      const products = MOCK_TENANT_PRODUCTS.filter(
        (p) => p.account_id === accountId && p.is_available && p.status === "active"
      ).map((p) => ({
        id: p.id,
        name: p.name,
        sku: p.sku,
        description: p.description,
        category: p.category,
        images: p.images,
        price: p.price,
        currency: p.currency,
        item_type: p.item_type,
        stock_quantity: p.track_inventory ? p.stock_quantity : null,
        variants: p.variants,
        service_duration_minutes: p.service_duration_minutes,
        service_booking_requirements: p.service_booking_requirements,
      }));

      return NextResponse.json({
        storeName: MOCK_CATALOGUE_SETTINGS.catalogue_name,
        currency: "INR",
        products,
      });
    }

    const supabase = await createClient();

    // Check settings
    const { data: settings } = await supabase
      .from("tenant_catalogue_settings")
      .select("catalogue_name, is_public_catalogue_enabled")
      .eq("account_id", accountId)
      .maybeSingle();

    if (settings && !settings.is_public_catalogue_enabled) {
      return NextResponse.json({ error: "Store catalogue is currently unavailable" }, { status: 403 });
    }

    const { data: products, error } = await supabase
      .from("tenant_products")
      .select("id, name, sku, description, category, images, price, currency, item_type, stock_quantity, track_inventory, variants, service_duration_minutes, service_booking_requirements")
      .eq("account_id", accountId)
      .eq("status", "active")
      .eq("is_available", true)
      .order("created_at", { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const safeProducts = (products || []).map((p) => ({
      ...p,
      stock_quantity: p.track_inventory ? p.stock_quantity : null,
    }));

    return NextResponse.json({
      storeName: settings?.catalogue_name || "Store",
      currency: "INR",
      products: safeProducts,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to load storefront" }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ accountId: string }> }
) {
  try {
    const { accountId } = await params;
    const body = await request.json();
    const validated = validateOrderPayload(body);
    const orderReference = generateOrderReference();

    let hasProduct = false;
    let hasService = false;
    for (const item of validated.items) {
      if (item.item_type === "service") hasService = true;
      else hasProduct = true;
    }

    const orderType: "product" | "service" | "mixed" =
      hasProduct && hasService ? "mixed" : hasService ? "service" : "product";

    const { subtotal, taxAmount, total } = calculateOrderTotals(validated.items, "INR");

    const isDemo = isDemoMode();
    if (isDemo) {
      const newOrder = {
        id: `ord_cust_${Date.now()}`,
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
        items: validated.items.map((it, idx) => ({
          id: `item_${Date.now()}_${idx}`,
          order_id: `ord_cust_${Date.now()}`,
          account_id: accountId,
          ...it,
          total_price: Math.round(it.unit_price * it.quantity * 100) / 100,
        })),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      MOCK_TENANT_ORDERS.unshift(newOrder);

      return NextResponse.json({
        success: true,
        orderReference,
        totalAmount: total,
        currency: "INR",
        message: "Order received. The store will contact you on WhatsApp with confirmation.",
      }, { status: 201 });
    }

    const supabase = await createClient();
    const { data: orderData, error: orderErr } = await supabase
      .from("tenant_orders")
      .insert({
        account_id: accountId,
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
      })
      .select()
      .single();

    if (orderErr) return NextResponse.json({ error: orderErr.message }, { status: 500 });

    const itemsToInsert = validated.items.map((it) => ({
      order_id: orderData.id,
      account_id: accountId,
      product_id: it.product_id,
      item_type: it.item_type,
      item_name: it.item_name,
      sku: it.sku,
      variant_id: it.variant_id,
      unit_price: it.unit_price,
      quantity: it.quantity,
      total_price: Math.round(it.unit_price * it.quantity * 100) / 100,
      service_scheduled_at: it.service_scheduled_at,
    }));

    await supabase.from("tenant_order_items").insert(itemsToInsert);

    return NextResponse.json({
      success: true,
      orderReference,
      totalAmount: total,
      currency: "INR",
      message: "Order placed successfully. The seller will contact you on WhatsApp.",
    }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to submit order" }, { status: 400 });
  }
}
