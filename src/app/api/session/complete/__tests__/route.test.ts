/**
 * @jest-environment node
 */

jest.mock("@/lib/supabase/server", () => ({
  createClient: jest.fn(),
}));

import { POST } from "../route";
import { createClient } from "@/lib/supabase/server";

const mockCreateClient = jest.mocked(createClient);

function makeUpdateMock() {
  const mockEqUserId = jest.fn().mockResolvedValue({ error: null });
  const mockEqId = jest.fn().mockReturnValue({ eq: mockEqUserId });
  const mockUpdate = jest.fn().mockReturnValue({ eq: mockEqId });
  return { mockUpdate, mockEqId, mockEqUserId };
}

describe("POST /api/session/complete", () => {
  it("returns 401 when unauthenticated", async () => {
    mockCreateClient.mockResolvedValue({
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: null } }) },
    } as never);
    const req = new Request("http://localhost/api/session/complete", {
      method: "POST",
      body: JSON.stringify({ results: [] }),
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("returns 400 when results is empty array", async () => {
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: jest
          .fn()
          .mockResolvedValue({ data: { user: { id: "u1" } } }),
      },
    } as never);
    const req = new Request("http://localhost/api/session/complete", {
      method: "POST",
      body: JSON.stringify({ results: [] }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 200 and calls update for each result", async () => {
    const { mockUpdate, mockEqId, mockEqUserId } = makeUpdateMock();
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: jest
          .fn()
          .mockResolvedValue({ data: { user: { id: "user-1" } } }),
      },
      from: jest.fn().mockReturnValue({ update: mockUpdate }),
    } as never);

    const req = new Request("http://localhost/api/session/complete", {
      method: "POST",
      body: JSON.stringify({
        results: [
          {
            id: "item-1",
            outcome: "remembered",
            interval_days: 1,
            consecutive_correct: 0,
          },
          {
            id: "item-2",
            outcome: "forgot",
            interval_days: 4,
            consecutive_correct: 2,
          },
        ],
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(mockUpdate).toHaveBeenCalledTimes(2);
    // remembered: interval_days doubles 1→2
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ interval_days: 2, consecutive_correct: 1 })
    );
    // forgot: resets to 1
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ interval_days: 1, consecutive_correct: 0 })
    );
    expect(mockEqId).toHaveBeenCalledWith("id", "item-1");
    expect(mockEqId).toHaveBeenCalledWith("id", "item-2");
    expect(mockEqUserId).toHaveBeenCalledWith("user_id", "user-1");
  });

  it("applies soft penalty (halved interval) when is_first_forgot=true for old card", async () => {
    const { mockUpdate, mockEqId, mockEqUserId } = makeUpdateMock();
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: jest
          .fn()
          .mockResolvedValue({ data: { user: { id: "user-1" } } }),
      },
      from: jest.fn().mockReturnValue({ update: mockUpdate }),
    } as never);

    const req = new Request("http://localhost/api/session/complete", {
      method: "POST",
      body: JSON.stringify({
        results: [
          {
            id: "item-1",
            outcome: "forgot",
            interval_days: 8,
            consecutive_correct: 3,
            is_first_forgot: true,
          },
        ],
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    // Soft penalty: interval halved from 8 to 4
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ interval_days: 4, consecutive_correct: 0 })
    );
  });

  it("applies full reset when is_first_forgot=false for old card", async () => {
    const { mockUpdate } = makeUpdateMock();
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: jest
          .fn()
          .mockResolvedValue({ data: { user: { id: "user-1" } } }),
      },
      from: jest.fn().mockReturnValue({ update: mockUpdate }),
    } as never);

    const req = new Request("http://localhost/api/session/complete", {
      method: "POST",
      body: JSON.stringify({
        results: [
          {
            id: "item-1",
            outcome: "forgot",
            interval_days: 8,
            consecutive_correct: 3,
            is_first_forgot: false,
          },
        ],
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    // Full reset: interval reset to 1
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ interval_days: 1, consecutive_correct: 0 })
    );
  });
});
