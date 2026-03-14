/**
 * @jest-environment node
 */

jest.mock("@/lib/supabase/server", () => ({
  createClient: jest.fn(),
}));

import { POST } from "../route";
import { createClient } from "@/lib/supabase/server";

const mockCreateClient = jest.mocked(createClient);

function makeSupabaseMock({
  user = { id: "user-1", email: "test@example.com" },
  insertCount = 2,
  dbError = null as { message: string } | null,
} = {}) {
  return {
    auth: {
      getUser: jest.fn().mockResolvedValue({ data: { user } }),
    },
    from: jest.fn().mockReturnValue({
      insert: jest.fn().mockResolvedValue({ error: dbError, count: insertCount }),
    }),
  };
}

describe("POST /api/items/bulk", () => {
  it("returns 401 when unauthenticated", async () => {
    mockCreateClient.mockResolvedValue({
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: null } }) },
    } as never);
    const req = new Request("http://localhost/api/items/bulk", {
      method: "POST",
      body: JSON.stringify({ items: [{ key: "k", value: "v" }] }),
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("returns 400 when items array is empty", async () => {
    mockCreateClient.mockResolvedValue(makeSupabaseMock() as never);
    const req = new Request("http://localhost/api/items/bulk", {
      method: "POST",
      body: JSON.stringify({ items: [] }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 when items field is missing", async () => {
    mockCreateClient.mockResolvedValue(makeSupabaseMock() as never);
    const req = new Request("http://localhost/api/items/bulk", {
      method: "POST",
      body: JSON.stringify({}),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 when an item has empty key", async () => {
    mockCreateClient.mockResolvedValue(makeSupabaseMock() as never);
    const req = new Request("http://localhost/api/items/bulk", {
      method: "POST",
      body: JSON.stringify({ items: [{ key: "", value: "v" }] }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 201 with count on valid batch", async () => {
    mockCreateClient.mockResolvedValue(makeSupabaseMock({ insertCount: 2 }) as never);
    const req = new Request("http://localhost/api/items/bulk", {
      method: "POST",
      body: JSON.stringify({
        items: [
          { key: "k1", value: "v1" },
          { key: "k2", value: "v2" },
        ],
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.count).toBe(2);
  });
});
