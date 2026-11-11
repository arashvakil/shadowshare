import { config as appConfig } from "../config.js";
import { randomBytes, randomUUID } from "node:crypto";
import { writeFileSync, readFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import http from "node:http";
import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { users } from "../db/schema.js";

export interface ShadowTlsCredentials {
  username: string;
  password: string;
  ssPassword: string;
}

export interface SingBoxClientOptions {
  domain: string;
  port: number;
  handshakeServer: string;
  strictMode: boolean;
  method: string;
  configPath: string;
  hysteria2Port: number;
  tuicPort: number;
  trojanPort: number;
  tlsCertPath: string;
  tlsKeyPath: string;
  /** When set, TCP-based direct protocols advertise this port to clients (SNI multiplexing). */
  sniRouterPort: number;
  /** Clean domain for Trojan/Hysteria2/TUIC TLS SNI (avoids exposing compromised domain). Falls back to `domain` if not set. */
  directTlsDomain: string;
  directTlsCertPath: string;
  directTlsKeyPath: string;
  /** Enable SOCKS5 inbound for DNS tunnel fallback (port 10053, per-user auth). */
  dnsttEnabled?: boolean;
  /** Docker container restarted after each config write (SINGBOX_CONTAINER_NAME). */
  containerName?: string;
}

export class SingBoxClient {
  private domain: string;
  private port: number;
  private handshakeServer: string;
  private strictMode: boolean;
  private method: string;
  private configPath: string;
  private serverPsk: string;
  private hysteria2Port: number;
  private tuicPort: number;
  private trojanPort: number;
  private tlsCertPath: string;
  private tlsKeyPath: string;
  private sniRouterPort: number;
  private directTlsDomain: string;
  private directTlsCertPath: string;
  private directTlsKeyPath: string;
  private dnsttEnabled: boolean;
  private containerName: string;

  constructor(options: SingBoxClientOptions) {
    this.domain = options.domain;
    this.port = options.port;
    this.handshakeServer = options.handshakeServer;
    this.strictMode = options.strictMode;
    this.method = options.method;
    this.configPath = options.configPath;
    this.hysteria2Port = options.hysteria2Port;
    this.tuicPort = options.tuicPort;
    this.trojanPort = options.trojanPort;
    this.tlsCertPath = options.tlsCertPath;
    this.tlsKeyPath = options.tlsKeyPath;
    this.sniRouterPort = options.sniRouterPort;
    this.directTlsDomain = options.directTlsDomain || options.domain;
    this.directTlsCertPath = options.directTlsCertPath || options.tlsCertPath;
    this.directTlsKeyPath = options.directTlsKeyPath || options.tlsKeyPath;
    this.dnsttEnabled = options.dnsttEnabled || false;
    this.containerName = options.containerName || appConfig.singboxContainerName;
    this.serverPsk = this.loadOrGenerateServerPsk();
  }

  private loadOrGenerateServerPsk(): string {
    const pskPath = join(dirname(this.configPath), "shadowtls-server-psk");
    const read = () => readFileSync(pskPath, "utf-8").trim();
    try {
      return read();
    } catch (err: any) {
      if (err.code !== "ENOENT") throw err;
    }
    // aes-128 requires exactly 16 bytes
    const psk = randomBytes(16).toString("base64");
    mkdirSync(dirname(pskPath), { recursive: true });
    try {
      // "wx": create only if absent, so two processes starting at once can't both write a PSK.
      writeFileSync(pskPath, psk + "\n", { encoding: "utf-8", flag: "wx", mode: 0o600 });
    } catch (err: any) {
      if (err.code === "EEXIST") return read();
      throw err;
    }
    console.log("Generated new ShadowTLS server PSK");
    return psk;
  }

  getServerPsk(): string {
    return this.serverPsk;
  }

  generateCredentials(): ShadowTlsCredentials {
    return {
      username: randomBytes(6).toString("hex"),
      password: randomBytes(16).toString("base64url"),
      // aes-128 iPSK must be exactly 16 bytes base64
      ssPassword: randomBytes(16).toString("base64"),
    };
  }

  generateHysteria2Password(): string {
    return randomBytes(16).toString("base64url");
  }

  generateTuicCredentials(): { uuid: string; password: string } {
    return {
      uuid: randomUUID(),
      password: randomBytes(16).toString("base64url"),
    };
  }

  generateTrojanPassword(): string {
    return randomBytes(16).toString("base64url");
  }

  generateDnsttCredentials(): { username: string; password: string } {
    return {
      username: randomBytes(6).toString("hex"),
      password: randomBytes(16).toString("base64url"),
    };
  }

  /** Return outbound objects for merging into a unified sing-box config. */
  buildOutbounds(creds: {
    shadowTlsPassword?: string | null;
    shadowTlsSsPassword?: string | null;
    hysteria2Password?: string | null;
    tuicUuid?: string | null;
    tuicPassword?: string | null;
    trojanPassword?: string | null;
  }): object[] {
    const outbounds: object[] = [];

    // ShadowTLS + Shadowsocks pair
    // SS outbound uses ShadowTLS as transport (detour), ShadowTLS connects to server
    // When SNI router is enabled, advertise the shared port (443) instead of the internal listen port
    if (creds.shadowTlsPassword && creds.shadowTlsSsPassword) {
      const shadowTlsClientPort = this.sniRouterPort || this.port;
      outbounds.push(
        {
          type: "shadowsocks",
          tag: "ShadowTLS",
          method: this.method,
          password: `${this.serverPsk}:${creds.shadowTlsSsPassword}`,
          detour: "ShadowTLS-transport",
        },
        {
          type: "shadowtls",
          tag: "ShadowTLS-transport",
          server: this.domain,
          server_port: shadowTlsClientPort,
          version: 3,
          password: creds.shadowTlsPassword,
          tls: {
            enabled: true,
            server_name: this.handshakeServer,
          },
        },
      );
    }

    // Hysteria2 — uses the clean direct-TLS domain (keep it out of your CDN zones).
    // UDP-based: won't work in Iran (UDP blocked), but useful for other countries.
    if (creds.hysteria2Password && this.hysteria2Port > 0) {
      outbounds.push({
        type: "hysteria2",
        tag: "Hysteria2",
        server: this.domain,
        server_port: this.hysteria2Port,
        password: creds.hysteria2Password,
        tls: {
          enabled: true,
          server_name: this.directTlsDomain,
        },
      });
    }

    // TUIC — uses clean TLS domain. UDP-based: won't work in Iran.
    if (creds.tuicUuid && creds.tuicPassword && this.tuicPort > 0) {
      outbounds.push({
        type: "tuic",
        tag: "TUIC",
        server: this.domain,
        server_port: this.tuicPort,
        uuid: creds.tuicUuid,
        password: creds.tuicPassword,
        congestion_control: "bbr",
        tls: {
          enabled: true,
          server_name: this.directTlsDomain,
        },
      });
    }

    // Trojan — TCP-based, uses SNI router port when available.
    // Clean TLS domain + uTLS chrome fingerprint for DPI resistance.
    if (creds.trojanPassword && this.trojanPort > 0) {
      const trojanClientPort = this.sniRouterPort || this.trojanPort;
      outbounds.push({
        type: "trojan",
        tag: "Trojan",
        server: this.domain,
        server_port: trojanClientPort,
        password: creds.trojanPassword,
        tls: {
          enabled: true,
          server_name: this.directTlsDomain,
          utls: { enabled: true, fingerprint: "chrome" },
        },
      });
    }

    return outbounds;
  }

  buildSsUri(ssPassword: string): string {
    const combinedPassword = `${this.serverPsk}:${ssPassword}`;
    const userInfo = Buffer.from(`${this.method}:${combinedPassword}`).toString("base64url");
    return `ss://${userInfo}@${this.domain}:${this.port}#ShadowShare`;
  }

  async syncConfig(): Promise<void> {
    const activeUsers = await db
      .select({
        shadowTlsUsername: users.shadowTlsUsername,
        shadowTlsPassword: users.shadowTlsPassword,
        shadowTlsSsPassword: users.shadowTlsSsPassword,
        hysteria2Password: users.hysteria2Password,
        tuicUuid: users.tuicUuid,
        tuicPassword: users.tuicPassword,
        trojanPassword: users.trojanPassword,
        dnsttSocksUsername: users.dnsttSocksUsername,
        dnsttSocksPassword: users.dnsttSocksPassword,
      })
      .from(users)
      .where(eq(users.isActive, true));

    const inbounds: object[] = [];

    // --- ShadowTLS + Shadowsocks inbounds ---
    {
      let shadowUsers = activeUsers
        .filter((u) => u.shadowTlsUsername && u.shadowTlsPassword && u.shadowTlsSsPassword)
        .map((u) => ({
          name: u.shadowTlsUsername!,
          password: u.shadowTlsPassword!,
        }));

      let ssUsers = activeUsers
        .filter((u) => u.shadowTlsUsername && u.shadowTlsSsPassword)
        .map((u) => ({
          name: u.shadowTlsUsername!,
          password: u.shadowTlsSsPassword!,
        }));

      // sing-box requires at least one user; add a placeholder if none exist
      if (shadowUsers.length === 0) {
        shadowUsers = [{ name: "__placeholder__", password: randomBytes(16).toString("base64url") }];
        ssUsers = [{ name: "__placeholder__", password: randomBytes(16).toString("base64") }];
      }

      inbounds.push(
        {
          type: "shadowtls",
          tag: "shadowtls-in",
          listen: "::",
          listen_port: this.port,
          version: 3,
          users: shadowUsers,
          handshake: {
            server: this.handshakeServer,
            server_port: 443,
          },
          strict_mode: this.strictMode,
          detour: "ss-in",
        },
        {
          type: "shadowsocks",
          tag: "ss-in",
          listen: "127.0.0.1",
          listen_port: 10000,
          method: this.method,
          password: this.serverPsk,
          users: ssUsers,
          network: "tcp",
        },
      );
    }

    // --- Hysteria2 inbound ---
    if (this.hysteria2Port > 0) {
      let hy2Users = activeUsers
        .filter((u) => u.hysteria2Password)
        .map((u) => ({
          name: u.shadowTlsUsername || u.hysteria2Password!.slice(0, 8),
          password: u.hysteria2Password!,
        }));

      if (hy2Users.length === 0) {
        hy2Users = [{ name: "__placeholder__", password: randomBytes(16).toString("base64url") }];
      }

      inbounds.push({
        type: "hysteria2",
        tag: "hysteria2-in",
        listen: "::",
        listen_port: this.hysteria2Port,
        users: hy2Users,
        tls: {
          enabled: true,
          certificate_path: this.directTlsCertPath,
          key_path: this.directTlsKeyPath,
        },
      });
    }

    // --- TUIC inbound ---
    if (this.tuicPort > 0) {
      let tuicUsers = activeUsers
        .filter((u) => u.tuicUuid && u.tuicPassword)
        .map((u) => ({
          name: u.shadowTlsUsername || u.tuicUuid!.slice(0, 8),
          uuid: u.tuicUuid!,
          password: u.tuicPassword!,
        }));

      if (tuicUsers.length === 0) {
        tuicUsers = [{ name: "__placeholder__", uuid: "00000000-0000-0000-0000-000000000000", password: randomBytes(16).toString("base64url") }];
      }

      inbounds.push({
        type: "tuic",
        tag: "tuic-in",
        listen: "::",
        listen_port: this.tuicPort,
        users: tuicUsers,
        congestion_control: "bbr",
        tls: {
          enabled: true,
          certificate_path: this.directTlsCertPath,
          key_path: this.directTlsKeyPath,
        },
      });
    }

    // --- Trojan inbound ---
    if (this.trojanPort > 0) {
      let trojanUsers = activeUsers
        .filter((u) => u.trojanPassword)
        .map((u) => ({
          name: u.shadowTlsUsername || u.trojanPassword!.slice(0, 8),
          password: u.trojanPassword!,
        }));

      if (trojanUsers.length === 0) {
        trojanUsers = [{ name: "__placeholder__", password: randomBytes(16).toString("base64url") }];
      }

      inbounds.push({
        type: "trojan",
        tag: "trojan-in",
        listen: "::",
        listen_port: this.trojanPort,
        users: trojanUsers,
        tls: {
          enabled: true,
          certificate_path: this.directTlsCertPath,
          key_path: this.directTlsKeyPath,
        },
      });
    }

    // --- SOCKS5 inbound for DNS tunnel fallback (dnstm → sing-box) ---
    if (this.dnsttEnabled) {
      let dnsttUsers = activeUsers
        .filter((u) => u.dnsttSocksUsername && u.dnsttSocksPassword)
        .map((u) => ({
          username: u.dnsttSocksUsername!,
          password: u.dnsttSocksPassword!,
        }));

      if (dnsttUsers.length === 0) {
        dnsttUsers = [{ username: "__placeholder__", password: randomBytes(16).toString("base64url") }];
      }

      inbounds.push({
        type: "socks",
        tag: "socks-dnstt-in",
        listen: "::",
        listen_port: 10053,
        users: dnsttUsers,
      });

      // No-auth SOCKS5 for MasterDnsVPN (has its own encryption/auth layer)
      inbounds.push({
        type: "socks",
        tag: "socks-masterdns-in",
        listen: "::",
        listen_port: 10054,
      });
    }

    // Optional Cloudflare WARP egress (hides the server IP from destinations).
    // Without WARP_* env vars, traffic exits directly.
    const warp = buildWarpEndpoint();
    const egress = warp ? "warp" : "direct";

    const config = {
      log: { level: "warn" },
      inbounds,
      endpoints: warp ? [warp] : [],
      outbounds: [
        {
          type: "direct",
          tag: "direct",
        },
      ],
      route: {
        rules: [
          { inbound: "ss-in", outbound: egress },
          ...(this.dnsttEnabled
            ? [
                { inbound: "socks-dnstt-in", outbound: egress },
                { inbound: "socks-masterdns-in", outbound: egress },
              ]
            : []),
        ],
        final: egress,
      },
      experimental: {
        clash_api: {
          external_controller: "0.0.0.0:9090",
        },
      },
    };

    mkdirSync(dirname(this.configPath), { recursive: true });
    writeFileSync(this.configPath, JSON.stringify(config, null, 2) + "\n", "utf-8");

    // Restart sing-box container to pick up new config
    await this.restartContainer();
  }

  private restartContainer(): Promise<void> {
    const containerName = this.containerName;
    return new Promise((resolve) => {
      const req = http.request(
        {
          socketPath: "/var/run/docker.sock",
          path: `/containers/${containerName}/restart?t=1`,
          method: "POST",
        },
        (res) => {
          res.resume();
          if (res.statusCode === 204 || res.statusCode === 304) {
            console.log("[sing-box] Container restarted");
          } else {
            console.error(`[sing-box] Container restart returned ${res.statusCode}`);
          }
          resolve();
        },
      );
      req.on("error", (err) => {
        console.error("[sing-box] Container restart failed:", JSON.stringify(err.message));
        resolve();
      });
      req.end();
    });
  }
}

function buildWarpEndpoint() {
  const w = appConfig.warp;
  if (!w.privateKey || !w.addressV4) return null;
  return {
    type: "wireguard",
    tag: "warp",
    mtu: 1280,
    address: [w.addressV4, ...(w.addressV6 ? [w.addressV6] : [])],
    private_key: w.privateKey,
    peers: [
      {
        address: w.peerHost,
        port: w.peerPort,
        // Cloudflare's published WARP peer key
        public_key: w.peerPublicKey,
        ...(w.reserved.length === 3 ? { reserved: w.reserved } : {}),
        allowed_ips: ["0.0.0.0/0", "::/0"],
        persistent_keepalive_interval: 30,
      },
    ],
  };
}
