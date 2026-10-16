import { NextResponse } from "next/server";
import { getCurrentAccount } from "@/lib/auth/account";
import { createClient } from "@/lib/supabase/server";
import { isDemoMode } from "@/lib/mock/client";
import {
  MOCK_TENANT_ORDERS,
  MOCK_TENANT_PRODUCTS,
  MOCK_ACCOUNT_ID,
} from "@/lib/mock/data";
import {
  transitionOrderStatus,
  verifyAndMarkOrderPaid,
} from "@/lib/catalogue/order-engine";
import { restoreProductStock } from "@/lib/catalogue/inventory";

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
      const order = MOCK_TENANT_ORDERS.find((o) => o.id === id && o.account_id === accountId);
      if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
      return NextResponse.json({ order });
    }

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("tenant_orders")
      .select("*, items:tenant_order_items(*)")
      .eq("id", id)
      .eq("account_id", accountId)
      .maybeSingle();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!data) return NextResponse.json({ error: "Order not found" }, { status: 404 });

    return NextResponse.json({ order: data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to fetch order" }, { status: 500 });
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

    // Demo Mode handling
    if (isDemo) {
      const idx = MOCK_TENANT_ORDERS.findIndex((o) => o.id === id && o.account_id === accountId);
      if (idx === -1) return NextResponse.json({ error: "Order not found" }, { status: 404 });
      const currentOrder = MOCK_TENANT_ORDERS[idx];

      let updatedOrder = { ...currentOrder };

      // Action 1: Strict Payment Verification
      if (body.action === "verify_payment") {
        updatedOrder = verifyAndMarkOrderPaid(currentOrder, {
          provider: body.provider || "bank_transfer_admin",
          paymentReference: body.paymentReference,
          verifiedBy: body.verifiedBy || "Super Admin",
          signatureValid: body.signatureValid,
          amountPaid: body.amountPaid,
        });
      }

      // Action 2: Status transition
      if (body.status && body.status !== currentOrder.status) {
        const nextStatus = transitionOrderStatus(currentOrder.status, body.status, body.reason);
        updatedOrder.status = nextStatus;

        // If transitioning to cancelled or refunded, restore stock in mock
        if (nextStatus === "cancelled" || nextStatus === "refunded") {
          for (const item of currentOrder.items || []) {
            if (item.product_id && item.item_type === "product") {
              const p = MOCK_TENANT_PRODUCTS.find((prod) => prod.id === item.product_id);
              if (p) restoreProductStock(p, item.quantity);
            }
          }
        }
      }

      // Action 3: Fulfilment status update
      if (body.fulfilment_status) {
        updatedOrder.fulfilment_status = body.fulfilment_status;
      }

      updatedOrder.updated_at = new Date().toISOString();
      MOCK_TENANT_ORDERS[idx] = updatedOrder;
      return NextResponse.json({ order: updatedOrder });
    }

    // Production mode with Supabase
    const supabase = await createClient();
    const { data: currentOrder, error: fetchErr } = await supabase
      .from("tenant_orders")
      .select("*, items:tenant_order_items(*)")
      .eq("id", id)
      .eq("account_id", accountId)
      .maybeSingle();

    if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 500 });
    if (!currentOrder) return NextResponse.json({ error: "Order not found" }, { status: 404 });

    const updateFields: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (body.action === "verify_payment") {
      const verified = verifyAndMarkOrderPaid(currentOrder, {
        provider: body.provider || "bank_transfer_admin",
        paymentReference: body.paymentReference,
        verifiedBy: body.verifiedBy || "Admin",
        signatureValid: body.signatureValid,
        amountPaid: body.amountPaid,
      });

      updateFields.payment_status = verified.payment_status;
      updateFields.status = verified.status;
      updateFields.payment_reference = verified.payment_reference;
      updateFields.payment_verified_at = verified.payment_verified_at;
      updateFields.metadata = verified.metadata;
    }

    if (body.status && body.status !== currentOrder.status) {
      const nextStatus = transitionOrderStatus(currentOrder.status, body.status, body.reason);
      updateFields.status = nextStatus;
      if (body.reason) updateFields.cancellation_reason = body.reason;

      // Stock restoration if cancelled or refunded
      if (nextStatus === "cancelled" || nextStatus === "refunded") {
        for (const item of currentOrder.items || []) {
          if (item.product_id && item.item_type === "product") {
            const { data: prod } = await supabase
              .from("tenant_products")
              .select("stock_quantity, track_inventory")
              .eq("id", item.product_id)
              .single();

            if (prod && prod.track_inventory) {
              await supabase
                .from("tenant_products")
                .update({ stock_quantity: prod.stock_quantity + item.quantity })
                .eq("id", item.product_id);
            }
          }
        }
      }
    }

    if (body.fulfilment_status) {
      updateFields.fulfilment_status = body.fulfilment_status;
    }

    const { data: updated, error: updateErr } = await supabase
      .from("tenant_orders")
      .update(updateFields)
      .eq("id", id)
      .eq("account_id", accountId)
      .select("*, items:tenant_order_items(*)")
      .single();

    if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });

    return NextResponse.json({ order: updated });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to update order" },
      { status: err.status || 400 }
    );
  }
}
