/**
 * @jest-environment node
 */

jest.mock("@/lib/supabase/server", () => {
  const createClient = jest.fn();
  return {
    createClient,
    createClientForRequest: jest.fn().mockImplementation(() => createClient()),
  };
});

import { POST } from "../route";
import { createClient } from "@/lib/supabase/server";

const mockCreateClient = jest.mocked(createClient);

/**
 * Builds a Supabase mock for the bulk route.
 *
 * The bulk route now:
 *   1. select("id, key, value").eq("user_id", ...) — fetch existing items
 *   2. insert(rows) — for new items
 *   3. update({ value }).eq("id", ...) — for duplicate keys
 */
function makeSupabaseMock({
  user = { id: "user-1", email: "test@example.com" },
  existingItems = [] as { id: string; key: string; value: string }[],
  dbError = null as { message: string } | null,
} = {}) {
  // select().eq() — returns existing items list
  const mockSelectEq = jest
    .fn()
    .mockResolvedValue({ data: existingItems, error: dbError });
  const mockSelect = jest.fn().mockReturnValue({ eq: mockSelectEq });

  // insert() — for new rows
  const mockInsert = jest
    .fn()
    .mockResolvedValue({ error: dbError, count: null });

  // update().eq() — for merge updates
  const mockUpdateEq = jest.fn().mockResolvedValue({ error: dbError });
  const mockUpdate = jest.fn().mockReturnValue({ eq: mockUpdateEq });

  return {
    auth: {
      getUser: jest.fn().mockResolvedValue({ data: { user } }),
    },
    from: jest.fn().mockReturnValue({
      select: mockSelect,
      insert: mockInsert,
      update: mockUpdate,
    }),
    _mockInsert: mockInsert,
    _mockUpdate: mockUpdate,
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

  it("returns 201 with count when all keys are new", async () => {
    mockCreateClient.mockResolvedValue(
      makeSupabaseMock({ existingItems: [] }) as never
    );
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

  it("returns 201 and merges when a key already exists", async () => {
    const existing = [{ id: "e1", key: "k1", value: "old value" }];
    const mock = makeSupabaseMock({ existingItems: existing });
    mockCreateClient.mockResolvedValue(mock as never);
    const req = new Request("http://localhost/api/items/bulk", {
      method: "POST",
      body: JSON.stringify({
        items: [{ key: "k1", value: "new value" }],
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.count).toBe(1);
    // The update should have been called with merged value
    expect(mock._mockUpdate).toHaveBeenCalledWith({
      value: "new value\n\nold value",
    });
  });

  it("returns 201 and handles a mix of new and duplicate keys", async () => {
    const existing = [{ id: "e1", key: "dup", value: "old" }];
    const mock = makeSupabaseMock({ existingItems: existing });
    mockCreateClient.mockResolvedValue(mock as never);
    const req = new Request("http://localhost/api/items/bulk", {
      method: "POST",
      body: JSON.stringify({
        items: [
          { key: "dup", value: "new" },
          { key: "brand-new", value: "value" },
        ],
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.count).toBe(2);
    // One update for dup, one insert for brand-new
    expect(mock._mockUpdate).toHaveBeenCalledWith({ value: "new\n\nold" });
    expect(mock._mockInsert).toHaveBeenCalledWith(
      [{ key: "brand-new", value: "value", user_id: "user-1" }],
      { count: "exact" }
    );
  });
});
