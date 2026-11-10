import crypto from "node:crypto";
import { writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { users } from "../db/schema.js";

export class SshTunnelClient {
  constructor(
    private host: string,
    private port: number,
    private user: string,
    private dataDir: string,
  ) {}

  generateKeyPair(): { publicKey: string; privateKey: string } {
    const { publicKey: pemPub, privateKey: pemPriv } =
      crypto.generateKeyPairSync("ed25519", {
        publicKeyEncoding: { type: "spki", format: "pem" },
        privateKeyEncoding: { type: "pkcs8", format: "pem" },
      });

    // Convert PEM public key to OpenSSH format
    const derBuf = crypto
      .createPublicKey(pemPub)
      .export({ type: "spki", format: "der" });

    // SPKI for ed25519 has a fixed 12-byte header; the raw 32-byte key follows
    const rawKey = derBuf.subarray(derBuf.length - 32);

    // OpenSSH ed25519 public key wire format:
    //   uint32 length of key type string + key type string +
    //   uint32 length of raw key + raw key
    const keyType = Buffer.from("ssh-ed25519");
    const keyTypeLenBuf = Buffer.alloc(4);
    keyTypeLenBuf.writeUInt32BE(keyType.length);
    const rawKeyLenBuf = Buffer.alloc(4);
    rawKeyLenBuf.writeUInt32BE(rawKey.length);

    const blob = Buffer.concat([keyTypeLenBuf, keyType, rawKeyLenBuf, rawKey]);
    const publicKey = `ssh-ed25519 ${blob.toString("base64")}`;

    // Keep private key as PEM (Hiddify accepts PEM format)
    const privateKey = pemPriv;

    return { publicKey, privateKey };
  }

  async syncAuthorizedKeys(): Promise<void> {
    const activeUsers = await db
      .select({ sshPublicKey: users.sshPublicKey })
      .from(users)
      .where(eq(users.isActive, true));

    const authorizedKeysPath = join(this.dataDir, "ssh-tunnel", "authorized_keys");
    mkdirSync(dirname(authorizedKeysPath), { recursive: true });

    const content = activeUsers
      .filter((u) => u.sshPublicKey)
      .map((u) => u.sshPublicKey!)
      .join("\n");

    writeFileSync(authorizedKeysPath, content ? content + "\n" : "");
    console.log(`[ssh-tunnel] Wrote ${activeUsers.filter(u => u.sshPublicKey).length} keys to authorized_keys`);
  }

  buildUri(privateKey: string): string {
    return `ssh://${this.user}@${this.host}:${this.port}/?pk=${encodeURIComponent(privateKey)}#ShadowShare-SSH`;
  }
}
