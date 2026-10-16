// ============================================================
// Multi-Project Supabase Adapter Architecture
//
// Separates:
// - Supabase Project A: Central platform / Admin CRM (subscriptions,
//   billing settings, audit logs, tenant provisioning, usage quotas)
// - Supabase Project B: Customer CRM application data (contacts,
//   conversations, pipelines, flows, WhatsApp config)
//
// Fallback & Adapter Mode:
// When PLATFORM_SUPABASE_URL is not yet configured as an independent
// project, the adapter runs safely on the current instance with
// strict schema and logical table separation.
// ============================================================

import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";
import { isDemoMode, createMockClient } from "@/lib/mock/client";
import type { SafeTenantUsageTelemetry } from "@/lib/auth/tenant-guard";

export interface SecurityAuditEvent {
  eventType:
    | "CROSS_TENANT_ATTEMPT"
    | "ADMIN_LOGIN"
    | "SUBSCRIPTION_STATUS_CHANGE"
    | "PLAN_PROVISIONED"
    | "GATEWAY_CONFIG_UPDATED"
    | "API_KEY_REVOKED";
  severity: "info" | "warning" | "critical";
  actorUserId?: string | null;
  targetAccountId?: string | null;
  ipAddress?: string | null;
  metadata?: Record<string, any>;
}

export function isPlatformConfigured(): boolean {
  return Boolean(
    (process.env.PLATFORM_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL) &&
      (process.env.PLATFORM_SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY)
  );
}

// ------------------------------------------------------------
// Project A: Platform & Admin CRM Client
// ------------------------------------------------------------
let platformClientSingleton: SupabaseClient | null = null;

export function getPlatformClient(): SupabaseClient {
  if (isDemoMode() || process.env.NODE_ENV === "test" || !isPlatformConfigured()) {
    return createMockClient();
  }

  if (platformClientSingleton) {
    return platformClientSingleton;
  }

  // Use separate Project A credentials if provided in env
  const platformUrl = process.env.PLATFORM_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const platformKey =
    process.env.PLATFORM_SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!platformUrl || !platformKey) {
    throw new Error(
      "[projects] Central Platform database credentials not configured (PLATFORM_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY missing)"
    );
  }

  platformClientSingleton = createSupabaseClient(platformUrl, platformKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  return platformClientSingleton;
}

// ------------------------------------------------------------
// Project B: Customer CRM Application Client
// ------------------------------------------------------------
export function getCustomerCrmAdminClient(): SupabaseClient {
  if (isDemoMode() || process.env.NODE_ENV === "test" || !isPlatformConfigured()) {
    return createMockClient();
  }

  const customerUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const customerServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!customerUrl || !customerServiceKey) {
    throw new Error(
      "[projects] Customer CRM database credentials missing (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)"
    );
  }

  return createSupabaseClient(customerUrl, customerServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

// ------------------------------------------------------------
// Secure Server-to-Server Metadata Synchronization
// Syncs ONLY high-level usage and subscription state to Project A.
// Private customer message contents are NEVER sent across projects.
// ------------------------------------------------------------
export async function syncTenantTelemetryToProjectA(
  telemetry: SafeTenantUsageTelemetry
): Promise<{ success: boolean; error?: string }> {
  try {
    if (isDemoMode() || process.env.NODE_ENV === "test" || !isPlatformConfigured()) {
      return { success: true };
    }

    const platformDb = getPlatformClient();

    const { error } = await platformDb.from("tenant_usage_telemetry").upsert(
      {
        account_id: telemetry.accountId,
        account_name: telemetry.accountName,
        total_contacts: telemetry.totalContacts,
        total_conversations: telemetry.totalConversations,
        messages_sent_30d: telemetry.totalMessagesSent30d,
        active_flows_count: telemetry.activeFlowsCount,
        subscription_status: telemetry.subscriptionStatus,
        plan_name: telemetry.planName,
        current_period_ends_at: telemetry.periodEndsAt,
        last_active_at: telemetry.lastActiveAt,
        synced_at: new Date().toISOString(),
      },
      { onConflict: "account_id" }
    );

    if (error) {
      console.warn("[projects] Failed to sync tenant telemetry to Project A:", error.message);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    console.error("[projects] Telemetry sync error:", err);
    return { success: false, error: err.message };
  }
}

// ------------------------------------------------------------
// Central Auditing & Security Event Logging
// Records critical events to Project A's platform_audit_logs table.
// ------------------------------------------------------------
export async function logPlatformSecurityEvent(event: SecurityAuditEvent): Promise<void> {
  try {
    if (isDemoMode() || process.env.NODE_ENV === "test" || !isPlatformConfigured()) {
      return;
    }

    const platformDb = getPlatformClient();

    await platformDb.from("platform_audit_logs").insert({
      event_type: event.eventType,
      severity: event.severity,
      actor_user_id: event.actorUserId || null,
      target_account_id: event.targetAccountId || null,
      ip_address: event.ipAddress || null,
      metadata: event.metadata || {},
      created_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[projects] Audit log write failure:", err);
  }
}
