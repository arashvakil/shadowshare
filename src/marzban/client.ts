import { Agent } from "undici";
import type { MarzbanToken, MarzbanUser, MarzbanUsersResponse, MarzbanSystemStats } from "./types.js";

export class MarzbanClient {
  private baseUrl: string;
  private username: string;
  private password: string;
  private token: string | null = null;
  private tokenExpiresAt = 0;
  private agent: Agent;

  constructor(apiUrl: string, username: string, password: string) {
    this.baseUrl = apiUrl.replace(/\/$/, "");
    this.username = username;
    this.password = password;
    // Allow self-signed certs (internal Docker network)
    this.agent = new Agent({ connect: { rejectUnauthorized: false } });
  }

  private async authenticate(): Promise<void> {
    // Re-use token if not expired (with 60s buffer)
    if (this.token && Date.now() < this.tokenExpiresAt - 60_000) return;

    const res = await fetch(`${this.baseUrl}/api/admin/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        username: this.username,
        password: this.password,
        grant_type: "password",
      }),
      // @ts-expect-error Node.js fetch supports undici dispatcher
      dispatcher: this.agent,
    });

    if (!res.ok) {
      await res.text().catch(() => "");
      throw new Error(`Marzban auth failed ${res.status}`);
    }

    const data = (await res.json()) as MarzbanToken;
    this.token = data.access_token;
    // Marzban tokens last ~24h, refresh every 12h
    this.tokenExpiresAt = Date.now() + 12 * 60 * 60 * 1000;
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    await this.authenticate();

    const fetchOpts = {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.token}`,
        ...options.headers,
      },
      dispatcher: this.agent,
    };

    const res = await fetch(`${this.baseUrl}${path}`, fetchOpts);

    if (res.status === 401) {
      // Token expired, retry once
      this.token = null;
      await this.authenticate();
      fetchOpts.headers = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.token}`,
        ...options.headers,
      };
      const retry = await fetch(`${this.baseUrl}${path}`, fetchOpts);
      if (!retry.ok) {
        await retry.text().catch(() => "");
        throw new Error(`Marzban API error ${retry.status} on ${path}`);
      }
      if (retry.status === 204) return undefined as T;
      return retry.json() as Promise<T>;
    }

    if (!res.ok) {
      await res.text().catch(() => "");
      throw new Error(`Marzban API error ${res.status} on ${path}`);
    }

    if (res.status === 204) return undefined as T;
    return res.json() as Promise<T>;
  }

  async createUser(username: string): Promise<MarzbanUser> {
    return this.request<MarzbanUser>("/api/user", {
      method: "POST",
      body: JSON.stringify({
        username,
        proxies: {
          vless: { flow: "xtls-rprx-vision" },
        },
        inbounds: {
          vless: ["VLESS_REALITY", "VLESS_XHTTP_REALITY", "VLESS_WS_CDN", "VLESS_GRPC_CDN", "VLESS_XHTTP_CDN", "VLESS_HTTPUPGRADE_CDN"],
        },
        data_limit: 0,
        expire: 0,
        status: "active",
      }),
    });
  }

  async getUser(username: string): Promise<MarzbanUser> {
    return this.request<MarzbanUser>(`/api/user/${encodeURIComponent(username)}`);
  }

  async getUsers(offset = 0, limit = 200): Promise<MarzbanUsersResponse> {
    return this.request<MarzbanUsersResponse>(`/api/users?offset=${offset}&limit=${limit}`);
  }

  async deleteUser(username: string): Promise<void> {
    await this.request<void>(`/api/user/${encodeURIComponent(username)}`, {
      method: "DELETE",
    });
  }

  async disableUser(username: string): Promise<MarzbanUser> {
    return this.request<MarzbanUser>(`/api/user/${encodeURIComponent(username)}`, {
      method: "PUT",
      body: JSON.stringify({ status: "disabled" }),
    });
  }

  async enableUser(username: string): Promise<MarzbanUser> {
    return this.request<MarzbanUser>(`/api/user/${encodeURIComponent(username)}`, {
      method: "PUT",
      body: JSON.stringify({ status: "active" }),
    });
  }

  async getSystemStats(): Promise<MarzbanSystemStats> {
    return this.request<MarzbanSystemStats>("/api/system");
  }
}
