/**
 * @jest-environment node
 */

jest.mock("@/lib/supabase/server", () => ({
  createClient: jest.fn(),
}));

import { GET, POST } from "../route";
import { DELETE } from "../[id]/route";
import { createClient } from "@/lib/supabase/server";

const mockCreateClient = jest.mocked(createClient);

function makeSupabaseMock({
  user = { id: "user-1", email: "test@example.com" },
  selectData = [] as unknown[],
  insertData = null as unknown,
  dbError = null as { message: string } | null,
} = {}) {
  const mockSingle = jest.fn().mockResolvedValue({ data: insertData, error: dbError });
  const mockSelect = jest.fn().mockReturnValue({ single: mockSingle });
  const mockInsert = jest.fn().mockReturnValue({ select: mockSelect });
  const mockOrder = jest.fn().mockResolvedValue({ data: selectData, error: dbError });
  const mockSelectQ = jest.fn().mockReturnValue({ order: mockOrder });
  const mockDelete = jest.fn().mockReturnValue({
    eq: jest.fn().mockResolvedValue({ error: dbError }),
  });

  return {
    auth: {
      getUser: jest.fn().mockResolvedValue({ data: { user } }),
    },
    from: jest.fn((table: string) => {
      if (table === "items") {
        return {
          select: mockSelectQ,
          insert: mockInsert,
          delete: mockDelete,
        };
      }
      return {};
    }),
    _mockSingle: mockSingle,
    _mockInsert: mockInsert,
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

  it("returns 201 with inserted item on valid body", async () => {
    const item = { id: "new-1", key: "k", value: "v" };
    mockCreateClient.mockResolvedValue(makeSupabaseMock({ insertData: item }) as never);
    const req = new Request("http://localhost/api/items", {
      method: "POST",
      body: JSON.stringify({ key: "k", value: "v" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body).toEqual(item);
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
