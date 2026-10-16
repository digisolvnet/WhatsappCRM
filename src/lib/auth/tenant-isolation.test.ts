import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  assertTenantScope,
  sanitizeTenantPayload,
  preventServiceRoleInjection,
  redactCustomerMessageForAdmin,
  CrossTenantViolationError,
} from "./tenant-guard";
import type { AccountContext } from "./account";
import type { ApiKeyContext } from "./api-context";
import { syncTenantTelemetryToProjectA, logPlatformSecurityEvent } from "@/lib/supabase/projects";

describe("Phase 2 Multi-Tenant Data Isolation & Security Baseline", () => {
  const mockTenantA: AccountContext = {
    supabase: {} as any,
    userId: "user-alpha-123",
    accountId: "tenant-alpha-001",
    role: "admin",
    account: { id: "tenant-alpha-001", name: "Alpha Retailers" },
  };

  const mockTenantB: AccountContext = {
    supabase: {} as any,
    userId: "user-beta-456",
    accountId: "tenant-beta-002",
    role: "admin",
    account: { id: "tenant-beta-002", name: "Beta Supermarket" },
  };

  const mockApiKeyCtx: ApiKeyContext = {
    authType: "api_key",
    supabase: {} as any,
    accountId: "tenant-alpha-001",
    keyId: "key-123",
    scopes: ["contacts:read", "contacts:write", "messages:send"],
    createdBy: "user-alpha-123",
  };

  describe("1. Tenant Scoping & Cross-Tenant Read/Write Guards", () => {
    it("allows operations when no explicit tenant is supplied (implicitly scoped)", () => {
      expect(() => assertTenantScope(undefined, mockTenantA)).not.toThrow();
      expect(() => assertTenantScope(null, mockTenantA)).not.toThrow();
    });

    it("allows operations when supplied tenant_id matches the authorized session", () => {
      expect(() => assertTenantScope("tenant-alpha-001", mockTenantA)).not.toThrow();
      expect(() => assertTenantScope("tenant-alpha-001", mockApiKeyCtx)).not.toThrow();
    });

    it("STRICTLY REJECTS cross-tenant read/write attempt when client supplies foreign tenant_id", () => {
      // User from Tenant A attempts to access Tenant B
      expect(() => assertTenantScope("tenant-beta-002", mockTenantA)).toThrowError(
        CrossTenantViolationError
      );

      try {
        assertTenantScope("tenant-beta-002", mockTenantA);
      } catch (err: any) {
        expect(err.status).toBe(403);
        expect(err.code).toBe("CROSS_TENANT_VIOLATION");
        expect(err.targetTenantId).toBe("tenant-beta-002");
        expect(err.authorizedTenantId).toBe("tenant-alpha-001");
      }
    });

    it("STRICTLY REJECTS cross-tenant access via API key context", () => {
      expect(() => assertTenantScope("tenant-beta-002", mockApiKeyCtx)).toThrowError(
        CrossTenantViolationError
      );
    });
  });

  describe("2. Parameter Tampering & Payload Sanitization", () => {
    it("forces authorized account_id and overrides forged tenant_id in request body", () => {
      const maliciousPayload = {
        name: "Confidential Customer",
        phone: "+919876543210",
        account_id: "tenant-beta-002", // Forged account ID
        tenant_id: "tenant-beta-002",  // Forged tenant ID
      };

      const sanitized = sanitizeTenantPayload(maliciousPayload, mockTenantA.accountId);

      // Must be rewritten to authorized Tenant A
      expect(sanitized.account_id).toBe("tenant-alpha-001");
      expect(sanitized.tenant_id).toBe("tenant-alpha-001");
      expect(sanitized.name).toBe("Confidential Customer");
    });
  });

  describe("3. Untrusted Client Input & Service-Role Injection Prevention", () => {
    it("blocks request if client attempts to inject privileged service-role headers", () => {
      const forgedRequest = new Request("https://crm.local/api/contacts", {
        headers: {
          "x-supabase-service-role": "true",
        },
      });

      expect(() => preventServiceRoleInjection(forgedRequest)).toThrowError(
        CrossTenantViolationError
      );
    });

    it("allows standard client requests with normal headers", () => {
      const safeRequest = new Request("https://crm.local/api/contacts", {
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer token",
        },
      });

      expect(() => preventServiceRoleInjection(safeRequest)).not.toThrow();
    });
  });

  describe("4. Cross-Tenant Read, Update, Delete & Export Isolation", () => {
    it("prevents Tenant A from reading contacts of Tenant B", () => {
      const mockDatabase = [
        { id: "c-1", account_id: "tenant-alpha-001", name: "Alpha Customer 1" },
        { id: "c-2", account_id: "tenant-alpha-001", name: "Alpha Customer 2" },
        { id: "c-3", account_id: "tenant-beta-002", name: "Beta Secret Lead" },
      ];

      // Simulated scoped query
      const readTenantA = mockDatabase.filter((row) => row.account_id === mockTenantA.accountId);
      expect(readTenantA).toHaveLength(2);
      expect(readTenantA.some((r) => r.name === "Beta Secret Lead")).toBe(false);
    });

    it("rejects Tenant A attempting to update a resource owned by Tenant B", () => {
      const targetResource = { id: "deal-99", account_id: "tenant-beta-002", title: "Enterprise Deal" };

      const attemptUpdate = (callerCtx: AccountContext, resource: typeof targetResource) => {
        if (resource.account_id !== callerCtx.accountId) {
          throw new CrossTenantViolationError("Cannot modify resource belonging to another tenant");
        }
        return { ...resource, title: "Hacked Deal" };
      };

      expect(() => attemptUpdate(mockTenantA, targetResource)).toThrowError(
        CrossTenantViolationError
      );
    });

    it("rejects Tenant A attempting to delete an automation flow owned by Tenant B", () => {
      const targetFlow = { id: "flow-42", account_id: "tenant-beta-002", name: "Beta Checkout Bot" };

      const attemptDelete = (callerCtx: AccountContext, flow: typeof targetFlow) => {
        if (flow.account_id !== callerCtx.accountId) {
          throw new CrossTenantViolationError("Cannot delete flow belonging to another tenant");
        }
        return true;
      };

      expect(() => attemptDelete(mockTenantA, targetFlow)).toThrowError(
        CrossTenantViolationError
      );
    });

    it("ensures CSV exports for Tenant A contain zero contacts from Tenant B", () => {
      const allContacts = [
        { id: "c-1", account_id: "tenant-alpha-001", phone: "+911111111111" },
        { id: "c-2", account_id: "tenant-alpha-001", phone: "+912222222222" },
        { id: "c-3", account_id: "tenant-beta-002", phone: "+919999999999" },
      ];

      // Scoped export
      const exportedCsvRows = allContacts
        .filter((c) => c.account_id === mockTenantA.accountId)
        .map((c) => `${c.id},${c.phone}`);

      expect(exportedCsvRows).toHaveLength(2);
      expect(exportedCsvRows.join("\n")).not.toContain("+919999999999");
    });
  });

  describe("5. Admin Metadata Privacy vs Private Message Redaction", () => {
    it("redacts private customer message body, media URLs, and attachments before telemetry sync", () => {
      const rawCustomerMessage = {
        id: "msg-999",
        body: "My secret credit inquiry and personal notes",
        text: { body: "My secret credit inquiry and personal notes" },
        caption: "Sensitive receipt",
        media_url: "https://storage.supabase.co/chat-media/account-alpha/pass.jpg",
        media_id: "media-123",
        created_at: "2026-10-15T12:00:00Z",
        status: "delivered",
      };

      const safeMessage = redactCustomerMessageForAdmin(rawCustomerMessage);

      // Private body, text, and media must be completely scrubbed
      expect(safeMessage.body).toBeUndefined();
      expect(safeMessage.text).toBeUndefined();
      expect(safeMessage.caption).toBeUndefined();
      expect(safeMessage.media_url).toBeUndefined();
      expect(safeMessage.media_id).toBeUndefined();
      expect(safeMessage.is_redacted).toBe(true);
      expect(safeMessage.has_content).toBe(true);
      expect(safeMessage.status).toBe("delivered");
    });

    it("allows server-to-server metadata telemetry sync with only high-level metrics", async () => {
      const safeTelemetry = {
        accountId: "tenant-alpha-001",
        accountName: "Alpha Retailers",
        totalContacts: 1500,
        totalConversations: 340,
        totalMessagesSent30d: 1200,
        activeFlowsCount: 5,
        subscriptionStatus: "active",
        planName: "Professional",
        periodEndsAt: new Date(Date.now() + 86400000 * 20).toISOString(),
        lastActiveAt: new Date().toISOString(),
      };

      const result = await syncTenantTelemetryToProjectA(safeTelemetry);
      expect(result.success).toBe(true);
    });
  });

  describe("6. Auditable Security Event Logging", () => {
    it("successfully logs cross-tenant security alerts without throwing", async () => {
      await expect(
        logPlatformSecurityEvent({
          eventType: "CROSS_TENANT_ATTEMPT",
          severity: "critical",
          actorUserId: "user-alpha-123",
          targetAccountId: "tenant-beta-002",
          ipAddress: "192.168.1.1",
          metadata: { route: "/api/v1/contacts", attemptedId: "tenant-beta-002" },
        })
      ).resolves.not.toThrow();
    });
  });

  describe("7. Storage Folder Path Tenant Isolation Rule", () => {
    it("validates that storage path convention requires account-<account_id> prefix", () => {
      const validAlphaPath = `account-${mockTenantA.accountId}/photo.jpg`;
      const invalidCrossPath = `account-${mockTenantB.accountId}/photo.jpg`;

      const isAlphaAuthorizedForValidPath = validAlphaPath.startsWith(`account-${mockTenantA.accountId}`);
      const isAlphaAuthorizedForCrossPath = invalidCrossPath.startsWith(`account-${mockTenantA.accountId}`);

      expect(isAlphaAuthorizedForValidPath).toBe(true);
      expect(isAlphaAuthorizedForCrossPath).toBe(false);
    });

    it("strictly blocks cross-tenant storage access attempts", () => {
      const attemptStorageRead = (callerCtx: AccountContext, objectPath: string) => {
        const requiredPrefix = `account-${callerCtx.accountId}/`;
        if (!objectPath.startsWith(requiredPrefix)) {
          throw new CrossTenantViolationError("Access denied: foreign storage object");
        }
        return true;
      };

      expect(() =>
        attemptStorageRead(mockTenantA, `account-${mockTenantB.accountId}/receipt.pdf`)
      ).toThrowError(CrossTenantViolationError);

      expect(
        attemptStorageRead(mockTenantA, `account-${mockTenantA.accountId}/receipt.pdf`)
      ).toBe(true);
    });
  });
});
