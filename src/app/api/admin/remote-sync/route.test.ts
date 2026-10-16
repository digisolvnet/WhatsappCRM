import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST, GET, PATCH } from "./route";

describe("API: /api/admin/remote-sync", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fails if instance_id or instance_url is missing in POST", async () => {
    const req = new Request("http://localhost:3000/api/admin/remote-sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Incomplete instance" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("instance_id and instance_url are required");
  });

  it("successfully registers or syncs a remote instance", async () => {
    const payload = {
      instance_id: "inst_test_123",
      instance_url: "https://test-client.vercel.app",
      name: "Acme Client Corp",
      owner_name: "John Doe",
      owner_email: "john@acme.com",
      billing_phone: "+919876543210",
      plan_name: "Monthly Pro",
      subscription_status: "active",
      current_period_ends_at: new Date(Date.now() + 30 * 86400000).toISOString(),
    };

    const req = new Request("http://localhost:3000/api/admin/remote-sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.instance_id).toBe("inst_test_123");
    expect(data.master_status).toBe("active");
    expect(data.allowed).toBe(true);
  });

  it("updates subscriber status via PATCH and retains master enforcement", async () => {
    const patchReq = new Request("http://localhost:3000/api/admin/remote-sync", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        instance_id: "inst_test_123",
        subscription_status: "suspended",
        notes: "Suspended for non-payment",
      }),
    });

    const patchRes = await PATCH(patchReq);
    expect(patchRes.status).toBe(200);
    const patchData = await patchRes.json();
    expect(patchData.success).toBe(true);
    expect(patchData.subscriber?.subscription_status).toBe("suspended");

    // Next sync from client must return suspended status
    const syncReq = new Request("http://localhost:3000/api/admin/remote-sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        instance_id: "inst_test_123",
        instance_url: "https://test-client.vercel.app",
        name: "Acme Client Corp",
        subscription_status: "active", // client attempts to report active
      }),
    });

    const syncRes = await POST(syncReq);
    const syncData = await syncRes.json();
    expect(syncData.master_status).toBe("suspended");
    expect(syncData.allowed).toBe(false);
  });
});
