/**
 * @jest-environment node
 */

jest.mock("@/lib/supabase/server", () => ({
  createClientForRequest: jest.fn(),
}));

import { POST } from "../route";
import { createClientForRequest } from "@/lib/supabase/server";
import { addPostponeDays } from "@/lib/items/postpone";

const mockCreateClientForRequest = jest.mocked(createClientForRequest);

function makeSupabaseMock({
  item = {
    id: "item-1",
    key: "key",
    value: "value",
    next_review_at: "2026-08-19",
    interval_days: 1,
    consecutive_correct: 0,
    created_at: "2026-08-01T00:00:00Z",
  },
  updatedItem = item,
  findError = null as { message: string } | null,
  updateError = null as { message: string } | null,
} = {}) {
  const findMaybeSingle = jest
    .fn()
    .mockResolvedValue({ data: item, error: findError });
  const findEqUser = jest.fn().mockReturnValue({ maybeSingle: findMaybeSingle });
  const findEqId = jest.fn().mockReturnValue({ eq: findEqUser });
  const select = jest.fn().mockReturnValue({ eq: findEqId });

  const updateSingle = jest
    .fn()
    .mockResolvedValue({ data: updatedItem, error: updateError });
  const updateSelect = jest.fn().mockReturnValue({ single: updateSingle });
  const updateEqUser = jest.fn().mockReturnValue({ select: updateSelect });
  const updateEqId = jest.fn().mockReturnValue({ eq: updateEqUser });
  const update = jest.fn().mockReturnValue({ eq: updateEqId });

  return {
    auth: {
      getUser: jest.fn().mockResolvedValue({
        data: { user: { id: "user-1", email: "test@example.com" } },
      }),
    },
    from: jest.fn().mockReturnValue({ select, update }),
    _mockUpdate: update,
  };
}

function request(body?: unknown) {
  return new Request("http://localhost/api/items/item-1/postpone", {
    method: "POST",
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

describe("POST /api/items/[id]/postpone", () => {
  it("returns 401 when unauthenticated", async () => {
    mockCreateClientForRequest.mockResolvedValue({
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: null } }) },
    } as never);

    const response = await POST(request(), {
      params: Promise.resolve({ id: "item-1" }),
    });

    expect(response.status).toBe(401);
  });

  it("defaults to three days and promotes a new card to the old pool", async () => {
    const mock = makeSupabaseMock();
    mockCreateClientForRequest.mockResolvedValue(mock as never);

    const response = await POST(request(), {
      params: Promise.resolve({ id: "item-1" }),
    });

    expect(response.status).toBe(200);
    expect(mock._mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        consecutive_correct: 1,
        next_review_at: addPostponeDays(new Date(), 3),
      })
    );
  });

  it("keeps an old card's learning history and applies the selected days", async () => {
    const oldItem = {
      id: "item-1",
      key: "key",
      value: "value",
      next_review_at: "2026-08-19",
      interval_days: 8,
      consecutive_correct: 3,
      created_at: "2026-08-01T00:00:00Z",
    };
    const mock = makeSupabaseMock({ item: oldItem });
    mockCreateClientForRequest.mockResolvedValue(mock as never);

    const response = await POST(request({ days: 7 }), {
      params: Promise.resolve({ id: "item-1" }),
    });

    expect(response.status).toBe(200);
    expect(mock._mockUpdate).toHaveBeenCalledWith({
      next_review_at: addPostponeDays(new Date(), 7),
    });
  });

  it("rejects invalid postponement periods", async () => {
    const mock = makeSupabaseMock();
    mockCreateClientForRequest.mockResolvedValue(mock as never);

    const response = await POST(request({ days: 0 }), {
      params: Promise.resolve({ id: "item-1" }),
    });

    expect(response.status).toBe(400);
    expect(mock._mockUpdate).not.toHaveBeenCalled();
  });

  it("returns 404 when the item is not owned by the user", async () => {
    const mock = makeSupabaseMock({ item: null as never });
    mockCreateClientForRequest.mockResolvedValue(mock as never);

    const response = await POST(request({ days: 3 }), {
      params: Promise.resolve({ id: "missing" }),
    });

    expect(response.status).toBe(404);
    expect(mock._mockUpdate).not.toHaveBeenCalled();
  });
});
