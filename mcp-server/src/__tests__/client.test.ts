import { RoteClient } from "../client.js";
import { AuthClient } from "../auth.js";

const TOKEN_RESPONSE = {
  token: "access-tok",
  refresh_token: "refresh-tok",
  expires_at: 9999999999,
};

let fetchMock: jest.Mock;
let authClient: AuthClient;

beforeEach(() => {
  fetchMock = jest.fn();
  global.fetch = fetchMock;
  authClient = new AuthClient("https://app.example.com", "u@e.com", "pass");
});

async function loginAuthClient() {
  fetchMock.mockResolvedValueOnce({ ok: true, json: async () => TOKEN_RESPONSE });
  await authClient.login();
}

describe("RoteClient.request — happy path", () => {
  it("sends Authorization: Bearer header", async () => {
    await loginAuthClient();
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: async () => JSON.stringify([{ id: "1" }]),
    });

    const client = new RoteClient("https://app.example.com", authClient);
    await client.request("/api/items");

    expect(fetchMock).toHaveBeenLastCalledWith(
      "https://app.example.com/api/items",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer access-tok",
        }),
      })
    );
  });

  it("returns parsed JSON on success", async () => {
    await loginAuthClient();
    const items = [{ id: "1", key: "q", value: "a" }];
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: async () => JSON.stringify(items),
    });

    const client = new RoteClient("https://app.example.com", authClient);
    const result = await client.request("/api/items");
    expect(result).toEqual(items);
  });

  it("returns null for 204 No Content", async () => {
    await loginAuthClient();
    fetchMock.mockResolvedValueOnce({ ok: true, status: 204, text: async () => "" });

    const client = new RoteClient("https://app.example.com", authClient);
    const result = await client.request("/api/items/1", { method: "DELETE" });
    expect(result).toBeNull();
  });

  it("auto-logs-in if not yet logged in", async () => {
    // fetch call 1: login, call 2: actual request
    fetchMock
      .mockResolvedValueOnce({ ok: true, json: async () => TOKEN_RESPONSE })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => "[]",
      });

    const freshAuth = new AuthClient("https://app.example.com", "u@e.com", "pass");
    const client = new RoteClient("https://app.example.com", freshAuth);
    await client.request("/api/items");

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

describe("RoteClient.request — auto-refresh on 401", () => {
  it("retries once after refreshing token on 401", async () => {
    await loginAuthClient();

    const newTokenResponse = {
      token: "new-access-tok",
      refresh_token: "new-refresh-tok",
      expires_at: 9999999999,
    };

    // First attempt → 401
    fetchMock
      .mockResolvedValueOnce({ ok: false, status: 401, text: async () => "Unauthorized" })
      // refresh call
      .mockResolvedValueOnce({ ok: true, json: async () => newTokenResponse })
      // retry → success
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => JSON.stringify([{ id: "1" }]),
      });

    const client = new RoteClient("https://app.example.com", authClient);
    const result = await client.request("/api/items");

    expect(result).toEqual([{ id: "1" }]);
    // login (1) + first request (2) + refresh (3) + retry (4) = 4 calls total
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });
});

describe("RoteClient.request — error handling", () => {
  it("throws with JSON error message on non-ok response", async () => {
    await loginAuthClient();
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 400,
      text: async () => JSON.stringify({ error: "key and value are required" }),
    });

    const client = new RoteClient("https://app.example.com", authClient);
    await expect(client.request("/api/items", { method: "POST", body: "{}" })).rejects.toThrow(
      "key and value are required"
    );
  });
});
