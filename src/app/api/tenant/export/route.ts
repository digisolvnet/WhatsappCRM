import { NextResponse } from "next/server";
import { getCurrentAccount } from "@/lib/auth/account";
import { isDemoMode } from "@/lib/mock/client";
import {
  MOCK_CONTACTS,
  MOCK_TENANT_PRODUCTS,
  MOCK_TENANT_ORDERS,
  MOCK_ACCOUNT_ID,
} from "@/lib/mock/data";
import {
  sanitizeTenantDataForExport,
  scheduleTenantAccountDeletion,
} from "@/lib/governance/data-lifecycle";

export async function POST(request: Request) {
  try {
    const isDemo = isDemoMode();
    const body = await request.json().catch(() => ({}));
    const action = body.action || "export";

    let accountId = MOCK_ACCOUNT_ID;
    let userId = "user-demo";

    if (!isDemo) {
      const accountCtx = await getCurrentAccount();
      if (!accountCtx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      if (accountCtx.role !== "owner" && accountCtx.role !== "admin") {
        return NextResponse.json({ error: "Forbidden: Only account owners can export data" }, { status: 403 });
      }
      accountId = accountCtx.accountId;
      userId = accountCtx.userId;
    }

    if (action === "schedule_deletion") {
      const deletionSchedule = scheduleTenantAccountDeletion({
        accountId,
        requestedBy: userId,
      });
      return NextResponse.json({ success: true, ...deletionSchedule });
    }

    // Default: Export
    const contacts = MOCK_CONTACTS.filter((c) => c.account_id === accountId);
    const products = MOCK_TENANT_PRODUCTS.filter((p) => p.account_id === accountId);
    const orders = MOCK_TENANT_ORDERS.filter((o) => o.account_id === accountId);

    const exportManifest = sanitizeTenantDataForExport({
      accountId,
      contacts,
      products,
      orders,
    });

    return NextResponse.json({
      success: true,
      manifest: exportManifest,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to process data request" }, { status: 500 });
  }
}
