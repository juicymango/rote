/**
 * @jest-environment node
 */

jest.mock("@/lib/supabase/server", () => ({
  createClient: jest.fn(),
}));

import { POST as LOGIN } from "../login/route";
import { POST as REFRESH } from "../refresh/route";
import { createClient } from "@/lib/supabase/server";

const mockCreateClient = jest.mocked(createClient);

const SESSION = {
  access_token: "access-tok",
  refresh_token: "refresh-tok",
  expires_at: 9999999999,
};

function makeAuthMock({
  signInResult = { data: { session: SESSION }, error: null } as {
    data: { session: typeof SESSION | null };
    error: { message: string } | null;
  },
  refreshResult = { data: { session: SESSION }, error: null } as {
    data: { session: typeof SESSION | null };
    error: { message: string } | null;
  },
} = {}) {
  return {
    auth: {
      signInWithPassword: jest.fn().mockResolvedValue(signInResult),
      refreshSession: jest.fn().mockResolvedValue(refreshResult),
    },
  };
}

// ── POST /api/auth/login ──────────────────────────────────────────────────────

describe("POST /api/auth/login", () => {
  it("returns 400 when email is missing", async () => {
    mockCreateClient.mockResolvedValue(makeAuthMock() as never);
    const req = new Request("http://localhost/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ password: "secret" }),
    });
    const res = await LOGIN(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBeDefined();
  });

  it("returns 400 when password is missing", async () => {
    mockCreateClient.mockResolvedValue(makeAuthMock() as never);
    const req = new Request("http://localhost/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: "user@example.com" }),
    });
    const res = await LOGIN(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBeDefined();
  });

  it("returns 401 when Supabase returns an error", async () => {
    mockCreateClient.mockResolvedValue(
      makeAuthMock({
        signInResult: { data: { session: null }, error: { message: "Invalid credentials" } },
      }) as never
    );
    const req = new Request("http://localhost/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: "user@example.com", password: "wrong" }),
    });
    const res = await LOGIN(req);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("Invalid credentials");
  });

  it("returns 401 when session is null without error message", async () => {
    mockCreateClient.mockResolvedValue(
      makeAuthMock({
        signInResult: { data: { session: null }, error: null },
      }) as never
    );
    const req = new Request("http://localhost/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: "user@example.com", password: "pass" }),
    });
    const res = await LOGIN(req);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBeDefined();
  });

  it("returns 200 with token, refresh_token, expires_at on success", async () => {
    mockCreateClient.mockResolvedValue(makeAuthMock() as never);
    const req = new Request("http://localhost/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: "user@example.com", password: "correct" }),
    });
    const res = await LOGIN(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.token).toBe(SESSION.access_token);
    expect(body.refresh_token).toBe(SESSION.refresh_token);
    expect(body.expires_at).toBe(SESSION.expires_at);
  });

  it("does not expose Supabase URL or anon key in response", async () => {
    mockCreateClient.mockResolvedValue(makeAuthMock() as never);
    const req = new Request("http://localhost/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: "user@example.com", password: "correct" }),
    });
    const res = await LOGIN(req);
    const body = await res.json();
    expect(JSON.stringify(body)).not.toMatch(/supabase/i);
    expect(body).not.toHaveProperty("SUPABASE_URL");
    expect(body).not.toHaveProperty("SUPABASE_ANON_KEY");
  });
});

// ── POST /api/auth/refresh ────────────────────────────────────────────────────

describe("POST /api/auth/refresh", () => {
  it("returns 400 when refresh_token is missing", async () => {
    mockCreateClient.mockResolvedValue(makeAuthMock() as never);
    const req = new Request("http://localhost/api/auth/refresh", {
      method: "POST",
      body: JSON.stringify({}),
    });
    const res = await REFRESH(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBeDefined();
  });

  it("returns 401 when Supabase returns an error", async () => {
    mockCreateClient.mockResolvedValue(
      makeAuthMock({
        refreshResult: { data: { session: null }, error: { message: "Token expired" } },
      }) as never
    );
    const req = new Request("http://localhost/api/auth/refresh", {
      method: "POST",
      body: JSON.stringify({ refresh_token: "expired-token" }),
    });
    const res = await REFRESH(req);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("Token expired");
  });

  it("returns 401 when session is null without error message", async () => {
    mockCreateClient.mockResolvedValue(
      makeAuthMock({
        refreshResult: { data: { session: null }, error: null },
      }) as never
    );
    const req = new Request("http://localhost/api/auth/refresh", {
      method: "POST",
      body: JSON.stringify({ refresh_token: "some-token" }),
    });
    const res = await REFRESH(req);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBeDefined();
  });

  it("returns 200 with token, refresh_token, expires_at on success", async () => {
    mockCreateClient.mockResolvedValue(makeAuthMock() as never);
    const req = new Request("http://localhost/api/auth/refresh", {
      method: "POST",
      body: JSON.stringify({ refresh_token: "valid-refresh-token" }),
    });
    const res = await REFRESH(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.token).toBe(SESSION.access_token);
    expect(body.refresh_token).toBe(SESSION.refresh_token);
    expect(body.expires_at).toBe(SESSION.expires_at);
  });

  it("does not expose Supabase URL or anon key in response", async () => {
    mockCreateClient.mockResolvedValue(makeAuthMock() as never);
    const req = new Request("http://localhost/api/auth/refresh", {
      method: "POST",
      body: JSON.stringify({ refresh_token: "valid-refresh-token" }),
    });
    const res = await REFRESH(req);
    const body = await res.json();
    expect(JSON.stringify(body)).not.toMatch(/supabase/i);
    expect(body).not.toHaveProperty("SUPABASE_URL");
    expect(body).not.toHaveProperty("SUPABASE_ANON_KEY");
  });
});
