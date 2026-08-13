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

function makeAuthenticatedClient(insertError: Error | null = null) {
  const mockInsert = jest.fn().mockResolvedValue({ error: insertError });
  const client = {
    auth: {
      getUser: jest
        .fn()
        .mockResolvedValue({ data: { user: { id: "user-1" } } }),
    },
    from: jest.fn().mockReturnValue({ insert: mockInsert }),
  };
  return { client, mockInsert };
}

describe("POST /api/events", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 401 when unauthenticated", async () => {
    mockCreateClient.mockResolvedValue({
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: null } }) },
    } as never);

    const response = await POST(
      new Request("http://localhost/api/events", {
        method: "POST",
        body: JSON.stringify({ event_name: "session_started" }),
      })
    );

    expect(response.status).toBe(401);
  });

  it("rejects an event outside the allowlist", async () => {
    const { client, mockInsert } = makeAuthenticatedClient();
    mockCreateClient.mockResolvedValue(client as never);

    const response = await POST(
      new Request("http://localhost/api/events", {
        method: "POST",
        body: JSON.stringify({ event_name: "card_content" }),
      })
    );

    expect(response.status).toBe(400);
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it("inserts an allowlisted event for the authenticated user", async () => {
    const { client, mockInsert } = makeAuthenticatedClient();
    mockCreateClient.mockResolvedValue(client as never);

    const response = await POST(
      new Request("http://localhost/api/events", {
        method: "POST",
        body: JSON.stringify({ event_name: "session_completed", user_id: "other-user" }),
      })
    );

    expect(response.status).toBe(204);
    expect(mockInsert).toHaveBeenCalledWith({
      user_id: "user-1",
      event_name: "session_completed",
    });
  });

  it("returns 500 when event storage fails", async () => {
    const { client } = makeAuthenticatedClient(new Error("database unavailable"));
    mockCreateClient.mockResolvedValue(client as never);

    const response = await POST(
      new Request("http://localhost/api/events", {
        method: "POST",
        body: JSON.stringify({ event_name: "item_created" }),
      })
    );

    expect(response.status).toBe(500);
    expect(await response.text()).toBe("database unavailable");
  });
});
