import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "./route";

describe("API: /api/admin/remote-control", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects unauthorized calls with invalid token", async () => {
    const req = new Request("http://localhost:3000/api/admin/remote-control", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-master-admin-token": "wrong_token",
      },
      body: JSON.stringify({ action: "suspend" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toContain("Unauthorized");
  });

  it("applies suspend command when authorized", async () => {
    const req = new Request("http://localhost:3000/api/admin/remote-control", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-master-admin-token": "digisolvnet_master_sync_2026",
      },
      body: JSON.stringify({
        action: "suspend",
        subscription_status: "suspended",
        notes: "Suspended by DigiSolvNet Central CRM",
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.updated_status).toBe("suspended");
  });

  it("applies activate command when authorized", async () => {
    const req = new Request("http://localhost:3000/api/admin/remote-control", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-master-admin-token": "digisolvnet_master_sync_2026",
      },
      body: JSON.stringify({
        action: "activate",
        subscription_status: "active",
        current_period_ends_at: new Date(Date.now() + 60 * 86400000).toISOString(),
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.updated_status).toBe("active");
  });
});
