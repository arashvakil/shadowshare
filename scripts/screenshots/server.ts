// Starts the built server against a freshly migrated, seeded throwaway database.
import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomBytes } from "node:crypto";

export const API_PORT = 3191;
export const ADMIN_PORT = 3991;
export const ADMIN_PASSWORD = "screenshots-demo-password";
const MARZBAN_PORT = 3992;

/** Read-only stand-in for the Marzban API so bandwidth and online status have data. */
function fakeMarzban(jsonPath: string) {
  return createServer((req, res) => {
    const send = (body: unknown) => { res.setHeader("Content-Type", "application/json"); res.end(JSON.stringify(body)); };
    const users = JSON.parse(readFileSync(jsonPath, "utf8"));
    const url = new URL(req.url!, "http://x");
    if (url.pathname === "/api/admin/token") return send({ access_token: "demo", token_type: "bearer" });
    if (url.pathname === "/api/users") return send({ users, total: users.length });
    if (url.pathname.startsWith("/api/user/")) return send(users.find((u: { username: string }) => u.username === decodeURIComponent(url.pathname.slice(10))) ?? {});
    if (url.pathname === "/api/system") return send({ version: "demo", mem_total: 8e9, mem_used: 3.1e9, cpu_cores: 4, cpu_usage: 12, total_user: users.length, users_active: users.length - 1, incoming_bandwidth: 0, outgoing_bandwidth: 0 });
    res.statusCode = 404; res.end("{}");
  }).listen(MARZBAN_PORT, "127.0.0.1");
}

export interface Demo { api: string; admin: string; stop(): void }

export async function startDemo(): Promise<Demo> {
  const dir = mkdtempSync(join(tmpdir(), "shadowshare-shots-"));
  const env = {
    ...process.env,
    DATABASE_PATH: join(dir, "demo.db"),
    TELEGRAM_ID_SALT: randomBytes(32).toString("hex"),
    ADMIN_PASSWORD,
    ADMIN_SESSION_SECRET: randomBytes(32).toString("hex"),
    API_PORT: String(API_PORT),
    ADMIN_PORT: String(ADMIN_PORT),
    BOT_TOKEN: "",
    DEMO_MARZBAN_JSON: join(dir, "marzban.json"),
    MARZBAN_API_URL: `http://127.0.0.1:${MARZBAN_PORT}`,
    MARZBAN_USERNAME: "demo",
    MARZBAN_PASSWORD: "demo",
    MARZBAN_SUB_URL_BASE: "https://go.example.org",
  };
  for (const script of ["src/db/migrate.ts", "scripts/screenshots/seed.ts"]) {
    const r = spawnSync("npx", ["tsx", script], { env, stdio: "inherit" });
    if (r.status !== 0) throw new Error(`${script} failed`);
  }
  const marz = fakeMarzban(env.DEMO_MARZBAN_JSON);
  const child: ChildProcess = spawn("node", ["dist/server.js"], { env, stdio: ["ignore", "pipe", "pipe"] });
  child.stderr!.on("data", (d) => process.env.SHOTS_DEBUG && process.stderr.write(d));
  child.stdout!.on("data", (d) => process.env.SHOTS_DEBUG && process.stdout.write(d));

  const api = `http://127.0.0.1:${API_PORT}`;
  const admin = `http://127.0.0.1:${ADMIN_PORT}`;
  for (let i = 0; i < 50; i++) {
    try { if ((await fetch(`${admin}/`)).ok) break; } catch {}
    await new Promise((r) => setTimeout(r, 200));
  }
  return {
    api, admin,
    stop() { child.kill(); marz.close(); rmSync(dir, { recursive: true, force: true }); },
  };
}
