import { generateKeyPairSync } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { config } from "../config.js";
import { db } from "../db/index.js";
import { users } from "../db/schema.js";
import { eq, isNotNull, and } from "drizzle-orm";
import { dockerExec } from "./docker-exec.js";
import type { AmneziaWgCreateResponse } from "./types.js";

const AWG_DATA_DIR = join(dirname(config.databasePath), "amneziawg");
const AWG_CONFIG_PATH = join(AWG_DATA_DIR, "awg0.conf");
const SERVER_KEY_PATH = join(AWG_DATA_DIR, "server-private-key");
const SERVER_PUBKEY_PATH = join(AWG_DATA_DIR, "server-public-key");

export class AmneziaWgClient {
  private containerName: string;
  private serverPublicKey: string = "";

  constructor() {
    this.containerName = config.awgContainerName;
  }

  /** Generate X25519 key pair (WireGuard-compatible base64). */
  private generateKeyPair(): { privateKey: string; publicKey: string } {
    const { publicKey, privateKey } = generateKeyPairSync("x25519", {
      publicKeyEncoding: { type: "spki", format: "der" },
      privateKeyEncoding: { type: "pkcs8", format: "der" },
    });
    // DER encoding: raw 32-byte key is at the end
    return {
      privateKey: Buffer.from(privateKey.subarray(privateKey.length - 32)).toString("base64"),
      publicKey: Buffer.from(publicKey.subarray(publicKey.length - 32)).toString("base64"),
    };
  }

  /**
   * Initialize AWG: generate server key pair if needed, write config with all active peers.
   * Must be called at startup before any createPeer/deletePeer calls.
   */
  async init(): Promise<void> {
    mkdirSync(AWG_DATA_DIR, { recursive: true });

    // "wx": create only if absent, so a concurrent start can't replace an existing key.
    const { privateKey, publicKey } = this.generateKeyPair();
    try {
      writeFileSync(SERVER_KEY_PATH, privateKey, { mode: 0o600, flag: "wx" });
      writeFileSync(SERVER_PUBKEY_PATH, publicKey);
      console.log("[awg] Generated new server key pair");
    } catch (err: any) {
      if (err.code !== "EEXIST") throw err;
    }

    this.serverPublicKey = readFileSync(SERVER_PUBKEY_PATH, "utf-8").trim();

    await this.regenerateClientConfigs();
    await this.syncConfig();
    console.log("[awg] Server initialized, config written");
  }

  /** Allocate next available IP in the AWG subnet. */
  private async allocateIp(): Promise<string> {
    const serverAddr = config.awgServerAddress.split("/")[0]; // e.g., "10.8.0.1"
    const prefix = serverAddr.split(".").slice(0, 3).join("."); // e.g., "10.8.0"

    const activeUsers = await db
      .select({ amneziaWgConfig: users.amneziaWgConfig })
      .from(users)
      .where(and(eq(users.isActive, true), isNotNull(users.amneziaWgConfig)));

    const usedIps = new Set<number>();
    usedIps.add(1); // server

    for (const u of activeUsers) {
      if (!u.amneziaWgConfig) continue;
      const match = u.amneziaWgConfig.match(/Address\s*=\s*\d+\.\d+\.\d+\.(\d+)/);
      if (match) usedIps.add(parseInt(match[1], 10));
    }

    for (let i = 2; i < 255; i++) {
      if (!usedIps.has(i)) return `${prefix}.${i}`;
    }
    throw new Error("No available IPs in AWG subnet");
  }

  /**
   * Create a peer: generate keys, allocate IP, add to running interface.
   * Returns the peer info and client config text.
   * The caller must insert into DB, then call syncConfig() (via syncAfterDbChange).
   */
  async createPeer(name: string): Promise<AmneziaWgCreateResponse> {
    const { privateKey: clientPrivate, publicKey: clientPublic } = this.generateKeyPair();
    const clientIp = await this.allocateIp();

    // Add to running interface (best-effort — container may not be up)
    const result = await dockerExec(this.containerName, [
      "awg", "set", "awg0", "peer", clientPublic, "allowed-ips", `${clientIp}/32`,
    ]);
    if (result === null) {
      console.warn("[awg] Could not add peer to running interface (container may not be running)");
    }

    const clientConfig = this.buildClientConfig(clientPrivate, clientIp);

    return {
      client: {
        id: clientPublic,
        name,
        client_ip: clientIp,
        client_public_key: clientPublic,
        status: "active",
        server_id: "local",
        server_name: "awg0",
        created_at: Math.floor(Date.now() / 1000),
      },
      config: clientConfig,
    };
  }

  /** Remove a peer from the running interface by public key. */
  async deletePeer(publicKey: string): Promise<void> {
    const result = await dockerExec(this.containerName, [
      "awg", "set", "awg0", "peer", publicKey, "remove",
    ]);
    if (result === null) {
      console.warn("[awg] Could not remove peer from running interface");
    }
  }

  /**
   * Regenerate awg0.conf from DB state and sync with running interface.
   * Call after any DB insert/update/delete that affects AWG peers.
   * Fire-and-forget safe — logs errors but doesn't throw.
   */
  async syncConfig(): Promise<void> {
    const serverPrivateKey = readFileSync(SERVER_KEY_PATH, "utf-8").trim();

    const activeUsers = await db
      .select({
        amneziaWgPeerId: users.amneziaWgPeerId,
        amneziaWgConfig: users.amneziaWgConfig,
      })
      .from(users)
      .where(and(eq(users.isActive, true), isNotNull(users.amneziaWgPeerId)));

    // Build server config
    let conf = `[Interface]\n`;
    conf += `PrivateKey = ${serverPrivateKey}\n`;
    conf += `Address = ${config.awgServerAddress}\n`;
    conf += `ListenPort = ${config.awgListenPort}\n`;
    conf += `PostUp = iptables -t nat -A POSTROUTING -o eth0 -j MASQUERADE; iptables -A FORWARD -i awg0 -j ACCEPT\n`;
    conf += `PostDown = iptables -t nat -D POSTROUTING -o eth0 -j MASQUERADE; iptables -D FORWARD -i awg0 -j ACCEPT\n`;
    conf += `S1 = ${config.awgS1}\n`;
    conf += `S2 = ${config.awgS2}\n`;
    conf += `S3 = ${config.awgS3}\n`;
    conf += `S4 = ${config.awgS4}\n`;
    conf += `H1 = ${config.awgH1}\n`;
    conf += `H2 = ${config.awgH2}\n`;
    conf += `H3 = ${config.awgH3}\n`;
    conf += `H4 = ${config.awgH4}\n`;

    // Add peer sections (skip legacy peers with invalid public keys)
    for (const u of activeUsers) {
      if (!u.amneziaWgPeerId || !u.amneziaWgConfig) continue;
      // Valid WireGuard public keys are 44-char base64 (32 bytes encoded)
      if (u.amneziaWgPeerId.length !== 44 || !u.amneziaWgPeerId.endsWith("=")) continue;
      const ipMatch = u.amneziaWgConfig.match(/Address\s*=\s*(\d+\.\d+\.\d+\.\d+)/);
      const clientIp = ipMatch?.[1];
      if (!clientIp) continue;

      conf += `\n[Peer]\n`;
      conf += `PublicKey = ${u.amneziaWgPeerId}\n`;
      conf += `AllowedIPs = ${clientIp}/32\n`;
    }

    writeFileSync(AWG_CONFIG_PATH, conf, { mode: 0o600 });

    // Try to sync running interface without downtime (best-effort)
    await dockerExec(this.containerName, [
      "bash", "-c",
      "awg-quick strip /etc/amneziawg/awg0.conf > /tmp/awg0.conf && awg syncconf awg0 /tmp/awg0.conf",
    ]);
  }

  /**
   * Regenerate all stored client configs with current AWG params.
   * Parses PrivateKey + Address from existing configs, rebuilds everything else.
   * Only updates configs whose obfuscation params don't match current settings.
   */
  private async regenerateClientConfigs(): Promise<void> {
    const activeUsers = await db
      .select({
        id: users.id,
        amneziaWgConfig: users.amneziaWgConfig,
      })
      .from(users)
      .where(and(eq(users.isActive, true), isNotNull(users.amneziaWgConfig)));

    let updated = 0;
    for (const u of activeUsers) {
      if (!u.amneziaWgConfig) continue;

      const privKeyMatch = u.amneziaWgConfig.match(/PrivateKey\s*=\s*(\S+)/);
      const addrMatch = u.amneziaWgConfig.match(/Address\s*=\s*(\d+\.\d+\.\d+\.\d+)/);
      if (!privKeyMatch || !addrMatch) continue;

      const newConfig = this.buildClientConfig(privKeyMatch[1], addrMatch[1]);
      if (newConfig === u.amneziaWgConfig) continue;

      await db.update(users).set({ amneziaWgConfig: newConfig }).where(eq(users.id, u.id));
      updated++;
    }

    if (updated > 0) {
      console.log(`[awg] Regenerated ${updated} client configs with current params`);
    }
  }

  /** Build a WireGuard .conf for the client with AWG 2.0 obfuscation params. */
  private buildClientConfig(clientPrivateKey: string, clientIp: string): string {
    let conf = `[Interface]\n`;
    conf += `PrivateKey = ${clientPrivateKey}\n`;
    conf += `Address = ${clientIp}/32\n`;
    conf += `DNS = ${config.awgDns}\n`;
    conf += `MTU = ${config.awgMtu}\n`;

    // AWG 2.0 shared params (must match server)
    conf += `S1 = ${config.awgS1}\n`;
    conf += `S2 = ${config.awgS2}\n`;
    conf += `S3 = ${config.awgS3}\n`;
    conf += `S4 = ${config.awgS4}\n`;
    conf += `H1 = ${config.awgH1}\n`;
    conf += `H2 = ${config.awgH2}\n`;
    conf += `H3 = ${config.awgH3}\n`;
    conf += `H4 = ${config.awgH4}\n`;

    // AWG 2.0 client-only params
    if (config.awgJc > 0) {
      conf += `Jc = ${config.awgJc}\n`;
      conf += `Jmin = ${config.awgJmin}\n`;
      conf += `Jmax = ${config.awgJmax}\n`;
    }

    // Signature packets (client-only, advanced obfuscation)
    if (config.awgI1) conf += `I1 = ${config.awgI1}\n`;
    if (config.awgI2) conf += `I2 = ${config.awgI2}\n`;
    if (config.awgI3) conf += `I3 = ${config.awgI3}\n`;
    if (config.awgI4) conf += `I4 = ${config.awgI4}\n`;
    if (config.awgI5) conf += `I5 = ${config.awgI5}\n`;

    conf += `\n[Peer]\n`;
    conf += `PublicKey = ${this.serverPublicKey}\n`;
    conf += `Endpoint = ${config.awgServerIp}:${config.awgListenPort}\n`;
    conf += `AllowedIPs = 0.0.0.0/0, ::/0\n`;
    conf += `PersistentKeepalive = 25\n`;

    return conf;
  }
}
