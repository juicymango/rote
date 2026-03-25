import { AuthClient } from "../auth.js";

const TOKEN_RESPONSE = {
  token: "access-tok",
  refresh_token: "refresh-tok",
  expires_at: 9999999999,
};

let fetchMock: jest.Mock;

beforeEach(() => {
  fetchMock = jest.fn();
  global.fetch = fetchMock;
});

describe("AuthClient.login", () => {
  it("POSTs to /api/auth/login with email and password", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => TOKEN_RESPONSE,
    });

    const client = new AuthClient("https://app.example.com", "user@example.com", "secret");
    await client.login();

    expect(fetchMock).toHaveBeenCalledWith(
      "https://app.example.com/api/auth/login",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ email: "user@example.com", password: "secret" }),
      })
    );
  });

  it("stores token after successful login", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => TOKEN_RESPONSE,
    });

    const client = new AuthClient("https://app.example.com", "user@example.com", "secret");
    await client.login();

    expect(client.getToken()).toBe(TOKEN_RESPONSE.token);
    expect(client.isLoggedIn()).toBe(true);
  });

  it("throws on login failure", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      statusText: "Unauthorized",
      json: async () => ({ error: "Invalid credentials" }),
    });

    const client = new AuthClient("https://app.example.com", "u@e.com", "wrong");
    await expect(client.login()).rejects.toThrow("Invalid credentials");
  });

  it("sends token as Authorization header on subsequent requests", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => TOKEN_RESPONSE,
    });

    const client = new AuthClient("https://app.example.com", "u@e.com", "pass");
    await client.login();

    expect(client.getToken()).toBe("access-tok");
  });
});

describe("AuthClient.refresh", () => {
  it("POSTs to /api/auth/refresh with stored refresh_token", async () => {
    fetchMock
      .mockResolvedValueOnce({ ok: true, json: async () => TOKEN_RESPONSE })  // login
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          token: "new-access-tok",
          refresh_token: "new-refresh-tok",
          expires_at: 9999999999,
        }),
      });

    const client = new AuthClient("https://app.example.com", "u@e.com", "pass");
    await client.login();
    await client.refresh();

    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "https://app.example.com/api/auth/refresh",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ refresh_token: TOKEN_RESPONSE.refresh_token }),
      })
    );
    expect(client.getToken()).toBe("new-access-tok");
  });

  it("throws if called without logging in first", async () => {
    const client = new AuthClient("https://app.example.com", "u@e.com", "pass");
    await expect(client.refresh()).rejects.toThrow("Not logged in");
  });

  it("throws on refresh failure", async () => {
    fetchMock
      .mockResolvedValueOnce({ ok: true, json: async () => TOKEN_RESPONSE })
      .mockResolvedValueOnce({
        ok: false,
        statusText: "Unauthorized",
        json: async () => ({ error: "Token expired" }),
      });

    const client = new AuthClient("https://app.example.com", "u@e.com", "pass");
    await client.login();
    await expect(client.refresh()).rejects.toThrow("Token expired");
  });
});
