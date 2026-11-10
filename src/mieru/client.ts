import { randomBytes } from "node:crypto";
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import http from "node:http";
import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { users } from "../db/schema.js";

export interface MieruClientOptions {
  serverIp: string;
  tcpPorts: string;
  udpPorts: string;
  configPath: string;
  containerName: string;
}

export class MieruClient {
  private serverIp: string;
  private tcpPorts: string;
  private udpPorts: string;
  private configPath: string;
  private containerName: string;

  constructor(opts: MieruClientOptions) {
    this.serverIp = opts.serverIp;
    this.tcpPorts = opts.tcpPorts;
    this.udpPorts = opts.udpPorts;
    this.configPath = opts.configPath;
    this.containerName = opts.containerName;
  }

  generateCredentials(): { username: string; password: string } {
    return {
      username: randomBytes(8).toString("hex"),
      password: randomBytes(16).toString("base64url"),
    };
  }

  buildUris(username: string, password: string): string[] {
    return [
      `mieru://${username}:${password}@${this.serverIp}/?port=${this.tcpPorts}&protocol=TCP&mtu=1400&multiplexing=MULTIPLEXING_HIGH#ShadowShare-MieruTCP`,
      `mieru://${username}:${password}@${this.serverIp}/?port=${this.udpPorts}&protocol=UDP&mtu=1400&multiplexing=MULTIPLEXING_HIGH#ShadowShare-MieruUDP`,
    ];
  }

  async syncConfig(): Promise<void> {
    const activeUsers = await db
      .select({
        mieruUsername: users.mieruUsername,
        mieruPassword: users.mieruPassword,
      })
      .from(users)
      .where(eq(users.isActive, true));

    let mieruUsers = activeUsers
      .filter((u) => u.mieruUsername && u.mieruPassword)
      .map((u) => ({
        name: u.mieruUsername!,
        password: u.mieruPassword!,
      }));

    if (mieruUsers.length === 0) {
      mieruUsers = [
        {
          name: "__placeholder__",
          password: randomBytes(16).toString("base64url"),
        },
      ];
    }

    const config = {
      portBindings: [
        { portRange: this.tcpPorts, protocol: "TCP" },
        { portRange: this.udpPorts, protocol: "UDP" },
      ],
      users: mieruUsers,
      loggingLevel: "WARN",
      mtu: 1400,
    };

    mkdirSync(dirname(this.configPath), { recursive: true });
    writeFileSync(this.configPath, JSON.stringify(config, null, 2));
    console.log(
      `[mieru] Config written with ${activeUsers.filter((u) => u.mieruUsername && u.mieruPassword).length} user(s)`,
    );

    await this.restartContainer();
  }

  private restartContainer(): Promise<void> {
    return new Promise((resolve) => {
      const req = http.request(
        {
          socketPath: "/var/run/docker.sock",
          path: `/containers/${this.containerName}/restart?t=1`,
          method: "POST",
        },
        (res) => {
          res.resume();
          if (res.statusCode === 204 || res.statusCode === 304) {
            console.log("[mieru] Container restarted");
          } else {
            console.error(
              `[mieru] Container restart returned ${res.statusCode}`,
            );
          }
          resolve();
        },
      );
      req.on("error", (err) => {
        console.error("[mieru] Container restart failed:", err.message);
        resolve();
      });
      req.end();
    });
  }
}
