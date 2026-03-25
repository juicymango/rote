import { AuthClient } from "./auth.js";

export class RoteClient {
  constructor(
    private readonly appUrl: string,
    private readonly auth: AuthClient
  ) {}

  /**
   * Make an authenticated HTTP request to the rote app.
   * On 401, attempts a token refresh and retries once.
   */
  async request(
    path: string,
    options: RequestInit = {}
  ): Promise<unknown> {
    if (!this.auth.isLoggedIn()) {
      await this.auth.login();
    }

    const result = await this._fetch(path, options);

    if (result.status === 401) {
      await this.auth.refresh();
      const retried = await this._fetch(path, options);
      return this._parse(retried);
    }

    return this._parse(result);
  }

  private async _fetch(path: string, options: RequestInit): Promise<Response> {
    return fetch(`${this.appUrl}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.auth.getToken()}`,
        ...(options.headers ?? {}),
      },
    });
  }

  private async _parse(res: Response): Promise<unknown> {
    if (res.status === 204) return null;

    const text = await res.text();

    if (!res.ok) {
      // Try JSON error, fall back to plain text
      try {
        const body = JSON.parse(text) as { error?: string };
        throw new Error(body.error ?? text);
      } catch {
        throw new Error(text || `HTTP ${res.status}`);
      }
    }

    if (!text) return null;

    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  }
}
