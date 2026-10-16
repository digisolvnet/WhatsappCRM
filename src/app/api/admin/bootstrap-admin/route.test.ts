import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "./route";

describe("API: /api/admin/bootstrap-admin", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("handles bootstrap request cleanly in demo/test mode", async () => {
    const req = new Request("http://localhost:3000/api/admin/bootstrap-admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "support@digisolvnet.com",
        password: "DigiSolvNet@2026!Admin",
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.admin_email).toBe("support@digisolvnet.com");
  });
});
