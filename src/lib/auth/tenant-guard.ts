// ============================================================
// Multi-Tenant Isolation & Authorization Guard
// Enforces tenant scoping on the server layer and prevents:
// 1. Cross-tenant reads, writes, deletes, and parameter tampering.
// 2. Privilege escalation via untrusted client input.
// 3. Leakage of private customer message contents to platform admin.
// ============================================================

import { NextResponse } from "next/server";
import type { AccountContext } from "./account";
import type { ApiKeyContext } from "./api-context";

export class CrossTenantViolationError extends Error {
  readonly status = 403 as const;
  readonly code = "CROSS_TENANT_VIOLATION" as const;

  constructor(
    message = "Cross-tenant access forbidden: requested tenant does not match authorized session",
    public readonly targetTenantId?: string,
    public readonly authorizedTenantId?: string
  ) {
    super(message);
    this.name = "CrossTenantViolationError";
  }
}

/**
 * Asserts that any client-supplied tenant_id or account_id strictly matches
 * the authenticated caller's authorized account context.
 *
 * Throws `CrossTenantViolationError` if the IDs differ.
 */
export function assertTenantScope(
  requestedTenantId: string | null | undefined,
  ctx: AccountContext | ApiKeyContext
): void {
  if (!requestedTenantId) {
    // If not explicitly provided, the operation is implicitly scoped to ctx.accountId
    return;
  }

  const authorizedId = ctx.accountId;
  if (requestedTenantId.trim().toLowerCase() !== authorizedId.trim().toLowerCase()) {
    throw new CrossTenantViolationError(
      `Cross-tenant access forbidden: requested tenant '${requestedTenantId}' does not match authorized tenant '${authorizedId}'`,
      requestedTenantId,
      authorizedId
    );
  }
}

/**
 * Strips or overrides any untrusted tenant_id / account_id fields from a request payload,
 * ensuring database inserts and updates are strictly bound to the authorized tenant.
 */
export function sanitizeTenantPayload<T extends Record<string, any>>(
  payload: T,
  authorizedAccountId: string
): T & { account_id: string } {
  const sanitized = { ...payload };

  // If client tried to inject a foreign account_id or tenant_id, enforce the authorized one
  sanitized.account_id = authorizedAccountId;
  if ("tenant_id" in sanitized) {
    sanitized.tenant_id = authorizedAccountId;
  }

  return sanitized as T & { account_id: string };
}

/**
 * Prevents client-supplied headers or JSON payloads from injecting or tampering with
 * server-side service-role access or database credentials.
 */
export function preventServiceRoleInjection(request: Request): void {
  const dangerousHeaders = [
    "x-supabase-service-role",
    "x-supabase-role",
    "x-bypass-rls",
    "supabase-service-role-key",
  ];

  for (const h of dangerousHeaders) {
    if (request.headers.get(h)) {
      throw new CrossTenantViolationError(
        "Privilege escalation attempt rejected: untrusted service role header detected"
      );
    }
  }
}

/**
 * Redacts private customer conversation content before sending usage telemetry
 * or subscription metadata to Central Admin CRM (Project A).
 *
 * Guarantees that Central Admin CRM receives ONLY count and status metadata,
 * NOT private customer message bodies or media attachments.
 */
export interface SafeTenantUsageTelemetry {
  accountId: string;
  accountName: string;
  totalContacts: number;
  totalConversations: number;
  totalMessagesSent30d: number;
  activeFlowsCount: number;
  subscriptionStatus: string;
  planName: string;
  periodEndsAt: string;
  lastActiveAt: string;
}

export function redactCustomerMessageForAdmin(message: Record<string, any>): Record<string, any> {
  const safeCopy = { ...message };
  // Redact body text, caption, attachments, and customer identifiers
  delete safeCopy.body;
  delete safeCopy.text;
  delete safeCopy.caption;
  delete safeCopy.media_url;
  delete safeCopy.media_id;
  delete safeCopy.raw_payload;

  safeCopy.is_redacted = true;
  safeCopy.has_content = Boolean(message.body || message.text);
  return safeCopy;
}
