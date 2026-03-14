/**
 * @jest-environment node
 */

jest.mock("@/lib/supabase/server", () => ({
  createClient: jest.fn(),
}));

jest.mock("@/lib/items/sessionPool", () => ({
  buildSessionPool: jest.fn((items: unknown[]) => items),
}));

import { GET } from "../route";
import { createClient } from "@/lib/supabase/server";
import { buildSessionPool } from "@/lib/items/sessionPool";

const mockCreateClient = jest.mocked(createClient);
const mockBuildSessionPool = jest.mocked(buildSessionPool);

const TODAY_STR = new Date().toISOString().slice(0, 10);

function makeItem(id: string) {
  return {
    id,
    key: "k",
    value: "v",
    next_review_at: TODAY_STR,
    interval_days: 1,
    consecutive_correct: 0,
    created_at: "2026-03-01T00:00:00Z",
  };
}

describe("GET /api/session", () => {
  it("returns 401 when unauthenticated", async () => {
    mockCreateClient.mockResolvedValue({
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: null } }) },
    } as never);
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns pool array when authenticated", async () => {
    const items = Array.from({ length: 5 }, (_, i) => makeItem(`item-${i}`));
    mockBuildSessionPool.mockReturnValue(items);
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: jest
          .fn()
          .mockResolvedValue({ data: { user: { id: "u1" } } }),
      },
      from: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          order: jest.fn().mockResolvedValue({ data: items, error: null }),
        }),
      }),
    } as never);

    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveLength(5);
  });

  it("pool has at most 20 items", async () => {
    const items = Array.from({ length: 20 }, (_, i) => makeItem(`item-${i}`));
    mockBuildSessionPool.mockReturnValue(items);
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: jest
          .fn()
          .mockResolvedValue({ data: { user: { id: "u1" } } }),
      },
      from: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          order: jest.fn().mockResolvedValue({ data: items, error: null }),
        }),
      }),
    } as never);

    const res = await GET();
    const body = await res.json();
    expect(body.length).toBeLessThanOrEqual(20);
  });
});
