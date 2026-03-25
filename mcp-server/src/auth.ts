export interface TokenState {
  token: string;
  refresh_token: string;
  expires_at: number;
}

export class AuthClient {
  private state: TokenState | null = null;

  constructor(
    private readonly appUrl: string,
    private readonly email: string,
    private readonly password: string
  ) {}

  /** Log in and store tokens. Call once before making API requests. */
  async login(): Promise<void> {
    const res = await fetch(`${this.appUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: this.email, password: this.password }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(`Login failed: ${body.error ?? res.statusText}`);
    }

    this.state = (await res.json()) as TokenState;
  }

  /** Refresh the access token using the stored refresh_token. */
  async refresh(): Promise<void> {
    if (!this.state) throw new Error("Not logged in");

    const res = await fetch(`${this.appUrl}/api/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: this.state.refresh_token }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(`Token refresh failed: ${body.error ?? res.statusText}`);
    }

    this.state = (await res.json()) as TokenState;
  }

  /** Return the current Bearer token, or throw if not logged in. */
  getToken(): string {
    if (!this.state) throw new Error("Not logged in");
    return this.state.token;
  }

  /** True if a token has been acquired. */
  isLoggedIn(): boolean {
    return this.state !== null;
  }
}
