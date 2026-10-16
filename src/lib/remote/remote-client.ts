/**
 * Client-Side and Server-Side Master CRM Remote Sync Client
 * Automatically syncs local tenant/instance details with DIGISOLVNET Master Admin CRM:
 * https://wacrm-six-sigma.vercel.app
 */

export interface RemoteSyncPayload {
  instance_id: string;
  instance_url?: string;
  name: string;
  owner_name?: string;
  owner_email?: string;
  billing_phone?: string;
  plan_name?: string;
  monthly_price?: number;
  currency?: string;
  subscription_status?: string;
  current_period_ends_at?: string;
  notes?: string;
}

export async function syncWithMasterAdmin(payload: RemoteSyncPayload): Promise<{
  success: boolean;
  master_status?: string;
  allowed?: boolean;
  error?: string;
}> {
  try {
    const masterAdminUrl =
      process.env.MASTER_ADMIN_URL ||
      process.env.NEXT_PUBLIC_MASTER_ADMIN_URL ||
      "https://wacrm-six-sigma.vercel.app";

    // Skip if running directly on the master instance itself
    const currentAppUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      (typeof window !== "undefined" ? window.location.origin : "");

    if (
      currentAppUrl.includes("wacrm-six-sigma.vercel.app") &&
      masterAdminUrl.includes("wacrm-six-sigma.vercel.app")
    ) {
      return { success: true, master_status: "active", allowed: true };
    }

    const instanceUrl =
      payload.instance_url ||
      currentAppUrl ||
      process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000";

    const syncSecret =
      process.env.REMOTE_SYNC_SECRET || "digisolvnet_master_sync_2026";

    const res = await fetch(`${masterAdminUrl.replace(/\/+$/, "")}/api/admin/remote-sync`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...payload,
        instance_url: instanceUrl,
        sync_secret: syncSecret,
      }),
    });

    const data = await res.json();
    return data;
  } catch (err: any) {
    // Non-blocking error handling — local instance continues operating gracefully
    return { success: false, error: err.message };
  }
}
