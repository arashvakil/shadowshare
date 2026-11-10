import { randomBytes } from "node:crypto";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { users } from "../db/schema.js";
import type { NaiveProxyUser } from "./types.js";

export class NaiveProxyClient {
  private domain: string;
  private caddyAdminUrl: string;
  private usersFilePath: string;

  constructor(domain: string, caddyAdminUrl: string, usersFilePath: string) {
    this.domain = domain;
    this.caddyAdminUrl = caddyAdminUrl.replace(/\/$/, "");
    this.usersFilePath = usersFilePath;
  }

  /** Generate a random username and password for a new user. */
  generateCredentials(): NaiveProxyUser {
    const username = randomBytes(8).toString("hex");
    const password = randomBytes(16).toString("base64url");
    return { username, password };
  }

  /** Build the naive+https:// URI for a user. */
  buildUri(username: string, password: string): string {
    return `naive+https://${username}:${password}@${this.domain}#ShadowShare`;
  }

  /** Build the naive+quic:// URI for QUIC variant. */
  buildQuicUri(username: string, password: string, quicDomain: string, quicPort: number): string {
    return `naive+quic://${username}:${password}@${quicDomain}:${quicPort}#ShadowShare-QUIC`;
  }

  /**
   * Regenerate the naive-users Caddy snippet file from all active users in the DB,
   * then reload Caddy via the admin API.
   */
  async syncUsersAndReload(): Promise<void> {
    // Fetch all active users with naive credentials
    const activeUsers = await db
      .select({
        naiveUsername: users.naiveUsername,
        naivePassword: users.naivePassword,
      })
      .from(users)
      .where(eq(users.isActive, true));

    // Always include a dummy entry so Caddy's probe_resistance has auth configured
    const lines: string[] = ["basic_auth __blocked__ __noaccess__"];
    for (const u of activeUsers) {
      if (u.naiveUsername && u.naivePassword) {
        lines.push(`basic_auth ${u.naiveUsername} ${u.naivePassword}`);
      }
    }

    // Write the users file
    mkdirSync(dirname(this.usersFilePath), { recursive: true });
    writeFileSync(this.usersFilePath, lines.join("\n") + "\n", "utf-8");
    console.log(`[naiveproxy] Wrote ${lines.length} users to ${this.usersFilePath}`);

    // Reload Caddy by POSTing the current Caddyfile
    await this.reloadCaddy();
  }

  /** Reload Caddy config via admin API. */
  private async reloadCaddy(): Promise<void> {
    let caddyfile: string;
    try {
      caddyfile = readFileSync("/etc/caddy/Caddyfile", "utf-8");
    } catch {
      console.error("[naiveproxy] Could not read /etc/caddy/Caddyfile for reload");
      return;
    }

    try {
      const res = await fetch(`${this.caddyAdminUrl}/load`, {
        method: "POST",
        headers: { "Content-Type": "text/caddyfile" },
        body: caddyfile,
        signal: AbortSignal.timeout(10_000),
      });
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        console.error(`[naiveproxy] Caddy reload failed (${res.status}): ${body}`);
      } else {
        console.log("[naiveproxy] Caddy reloaded successfully");
      }
    } catch (err) {
      console.error("[naiveproxy] Caddy reload request failed:", err);
    }
  }
}
