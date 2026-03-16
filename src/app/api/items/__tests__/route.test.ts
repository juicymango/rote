/**
 * @jest-environment node
 */

jest.mock("@/lib/supabase/server", () => ({
  createClient: jest.fn(),
}));

import { GET, POST } from "../route";
import { DELETE, PUT } from "../[id]/route";
import { createClient } from "@/lib/supabase/server";

const mockCreateClient = jest.mocked(createClient);

/**
 * Builds a flexible Supabase mock.
 *
 * - selectData: returned by GET /api/items (list query)
 * - insertData: returned by POST /api/items (insert → select → single)
 * - maybeSingleData: returned by duplicate-key check queries (.maybySingle())
 * - updateData: returned by PUT /api/items/[id] (update → select → single)
 * - dbError: propagated to all operations unless overridden
 */
function makeSupabaseMock({
  user = { id: "user-1", email: "test@example.com" },
  selectData = [] as unknown[],
  insertData = null as unknown,
  maybeSingleData = null as unknown,
  updateData = null as unknown,
  dbError = null as { message: string } | null,
} = {}) {
  // For PUT: update().eq().eq().select().single()
  const mockUpdateSingle = jest
    .fn()
    .mockResolvedValue({ data: updateData, error: dbError });
  const mockUpdateSelect = jest.fn().mockReturnValue({ single: mockUpdateSingle });
  const mockUpdateEqUserId = jest
    .fn()
    .mockReturnValue({ select: mockUpdateSelect });
  const mockUpdateEqId = jest.fn().mockReturnValue({ eq: mockUpdateEqUserId });
  const mockUpdate = jest.fn().mockReturnValue({ eq: mockUpdateEqId });

  // For POST single: insert().select().single()
  const mockSingle = jest
    .fn()
    .mockResolvedValue({ data: insertData, error: dbError });
  const mockInsertSelect = jest.fn().mockReturnValue({ single: mockSingle });
  const mockInsert = jest.fn().mockReturnValue({ select: mockInsertSelect });

  // For GET: select().order()
  const mockOrder = jest
    .fn()
    .mockResolvedValue({ data: selectData, error: dbError });
  const mockSelectQ = jest.fn().mockReturnValue({ order: mockOrder });

  // For DELETE: delete().eq()
  const mockDelete = jest.fn().mockReturnValue({
    eq: jest.fn().mockResolvedValue({ error: dbError }),
  });

  // For duplicate-key check: select().eq().eq().neq().maybySingle()
  // Also used by POST single create duplicate check: select().eq().eq().maybySingle()
  const mockMaybeSingle = jest
    .fn()
    .mockResolvedValue({ data: maybeSingleData, error: null });
  const mockDupNeq = jest.fn().mockReturnValue({ maybeSingle: mockMaybeSingle });
  const mockDupEqKey = jest.fn().mockReturnValue({
    neq: mockDupNeq,
    maybeSingle: mockMaybeSingle,
  });
  const mockDupEqUserId = jest.fn().mockReturnValue({ eq: mockDupEqKey });
  const mockDupSelect = jest.fn().mockReturnValue({ eq: mockDupEqUserId });

  return {
    auth: {
      getUser: jest.fn().mockResolvedValue({ data: { user } }),
    },
    from: jest.fn((table: string) => {
      if (table === "items") {
        return {
          select: (cols: string) => {
            // List query (GET): select("*") or select() with no specific single-id pattern
            // Dup-key check: select("id") or select("id, value")
            if (cols === "*" || cols === undefined) {
              return mockSelectQ();
            }
            // duplicate check selects (id, or id + value)
            return mockDupSelect(cols);
          },
          insert: mockInsert,
          delete: mockDelete,
          update: mockUpdate,
        };
      }
      return {};
    }),
    // expose for assertions
    _mockSingle: mockSingle,
    _mockInsert: mockInsert,
    _mockUpdate: mockUpdate,
    _mockMaybeSingle: mockMaybeSingle,
  };
}

describe("GET /api/items", () => {
  it("returns 401 when unauthenticated", async () => {
    mockCreateClient.mockResolvedValue({
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: null } }) },
    } as never);
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns items array when authenticated", async () => {
    const items = [{ id: "1", key: "q", value: "a" }];
    mockCreateClient.mockResolvedValue(makeSupabaseMock({ selectData: items }) as never);
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual(items);
  });
});

describe("POST /api/items", () => {
  it("returns 401 when unauthenticated", async () => {
    mockCreateClient.mockResolvedValue({
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: null } }) },
    } as never);
    const req = new Request("http://localhost/api/items", {
      method: "POST",
      body: JSON.stringify({ key: "k", value: "v" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("returns 400 when key is missing", async () => {
    mockCreateClient.mockResolvedValue(makeSupabaseMock() as never);
    const req = new Request("http://localhost/api/items", {
      method: "POST",
      body: JSON.stringify({ key: "", value: "v" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 when value is missing", async () => {
    mockCreateClient.mockResolvedValue(makeSupabaseMock() as never);
    const req = new Request("http://localhost/api/items", {
      method: "POST",
      body: JSON.stringify({ key: "k", value: "" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 201 with inserted item on valid body (no duplicate)", async () => {
    const item = { id: "new-1", key: "k", value: "v" };
    mockCreateClient.mockResolvedValue(
      makeSupabaseMock({ insertData: item, maybeSingleData: null }) as never
    );
    const req = new Request("http://localhost/api/items", {
      method: "POST",
      body: JSON.stringify({ key: "k", value: "v" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body).toEqual(item);
  });

  it("returns 200 and merges value when key already exists", async () => {
    const existingItem = { id: "existing-1", key: "k", value: "old content" };
    const mergedItem = { id: "existing-1", key: "k", value: "new content\n\nold content" };
    const mock = makeSupabaseMock({
      maybeSingleData: existingItem,
      updateData: mergedItem,
    });
    mockCreateClient.mockResolvedValue(mock as never);
    const req = new Request("http://localhost/api/items", {
      method: "POST",
      body: JSON.stringify({ key: "k", value: "new content" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.value).toBe("new content\n\nold content");
  });
});

describe("DELETE /api/items/[id]", () => {
  it("returns 401 when unauthenticated", async () => {
    mockCreateClient.mockResolvedValue({
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: null } }) },
    } as never);
    const res = await DELETE(new Request("http://localhost/api/items/1"), {
      params: Promise.resolve({ id: "1" }),
    });
    expect(res.status).toBe(401);
  });

  it("returns 204 on successful delete", async () => {
    mockCreateClient.mockResolvedValue(makeSupabaseMock() as never);
    const res = await DELETE(new Request("http://localhost/api/items/1"), {
      params: Promise.resolve({ id: "1" }),
    });
    expect(res.status).toBe(204);
  });
});

describe("PUT /api/items/[id]", () => {
  it("returns 401 when unauthenticated", async () => {
    mockCreateClient.mockResolvedValue({
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: null } }) },
    } as never);
    const res = await PUT(
      new Request("http://localhost/api/items/1", {
        method: "PUT",
        body: JSON.stringify({ key: "k", value: "v" }),
      }),
      { params: Promise.resolve({ id: "1" }) }
    );
    expect(res.status).toBe(401);
  });

  it("returns 400 when key is missing", async () => {
    mockCreateClient.mockResolvedValue(makeSupabaseMock() as never);
    const res = await PUT(
      new Request("http://localhost/api/items/1", {
        method: "PUT",
        body: JSON.stringify({ key: "", value: "v" }),
      }),
      { params: Promise.resolve({ id: "1" }) }
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 when value is missing", async () => {
    mockCreateClient.mockResolvedValue(makeSupabaseMock() as never);
    const res = await PUT(
      new Request("http://localhost/api/items/1", {
        method: "PUT",
        body: JSON.stringify({ key: "k", value: "" }),
      }),
      { params: Promise.resolve({ id: "1" }) }
    );
    expect(res.status).toBe(400);
  });

  it("returns 409 when key already exists on a different item", async () => {
    mockCreateClient.mockResolvedValue(
      makeSupabaseMock({ maybeSingleData: { id: "other-item" } }) as never
    );
    const res = await PUT(
      new Request("http://localhost/api/items/1", {
        method: "PUT",
        body: JSON.stringify({ key: "existing-key", value: "v" }),
      }),
      { params: Promise.resolve({ id: "1" }) }
    );
    expect(res.status).toBe(409);
  });

  it("returns 200 with updated item on valid body", async () => {
    const updated = { id: "1", key: "new-key", value: "new-value" };
    mockCreateClient.mockResolvedValue(
      makeSupabaseMock({ maybeSingleData: null, updateData: updated }) as never
    );
    const res = await PUT(
      new Request("http://localhost/api/items/1", {
        method: "PUT",
        body: JSON.stringify({ key: "new-key", value: "new-value" }),
      }),
      { params: Promise.resolve({ id: "1" }) }
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual(updated);
  });

  it("passes optional fields through to the update", async () => {
    const updated = {
      id: "1",
      key: "k",
      value: "v",
      next_review_at: "2026-04-01",
      interval_days: 4,
      consecutive_correct: 2,
    };
    mockCreateClient.mockResolvedValue(
      makeSupabaseMock({ maybeSingleData: null, updateData: updated }) as never
    );
    const res = await PUT(
      new Request("http://localhost/api/items/1", {
        method: "PUT",
        body: JSON.stringify({
          key: "k",
          value: "v",
          next_review_at: "2026-04-01",
          interval_days: 4,
          consecutive_correct: 2,
        }),
      }),
      { params: Promise.resolve({ id: "1" }) }
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.interval_days).toBe(4);
    expect(body.consecutive_correct).toBe(2);
    expect(body.next_review_at).toBe("2026-04-01");
  });
});
