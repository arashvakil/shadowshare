// The sing-box subscription pipeline (GET /api/web/singbox) and the sing-box
// server config are the most fragile parts of ShadowShare: one wrong field and
// every client or the whole sidecar fails. This test renders both from a seeded
// user with every protocol enabled, checks the invariants documented in
// docs/deploy.md and the code comments, and, when a sing-box binary is
// available (SING_BOX_BIN, as in CI), runs `sing-box check` on the server config.
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomBytes, randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";

const dir = mkdtempSync(join(tmpdir(), "shadowshare-singbox-"));

// A stand-in for Marzban's sing-box subscription: the outbound shapes Marzban emits.
const CDN = "cdn.example.org";
const marzbanSub = {
  log: { level: "warn" },
  dns: { servers: [{ tag: "dns-remote", address: "1.1.1.1", detour: "proxy" }, { tag: "dns-local", address: "8.8.8.8", detour: "direct" }], final: "dns-remote" },
  inbounds: [{ type: "tun", tag: "tun-in", address: ["172.19.0.1/30"], auto_route: true }],
  outbounds: [
    { type: "selector", tag: "proxy", outbounds: ["WS-CDN (u1)", "HU-CDN (u1)", "Reality (u1)"] },
    { type: "urltest", tag: "Best Latency", outbounds: ["WS-CDN (u1)"] },
    { type: "vless", tag: "WS-CDN (u1)", server: CDN, server_port: 443, uuid: randomUUID(), tls: { enabled: true, server_name: CDN }, transport: { type: "ws", path: "/ws", headers: { Host: CDN } } },
    { type: "vless", tag: "HU-CDN (u1)", server: CDN, server_port: 443, uuid: randomUUID(), tls: { enabled: true, server_name: CDN }, transport: { type: "httpupgrade", path: "/hu", host: CDN } },
    { type: "vless", tag: "Reality (u1)", server: "origin.example.org", server_port: 443, uuid: randomUUID(), flow: "xtls-rprx-vision", tls: { enabled: true, server_name: "www.example.com", utls: { enabled: true, fingerprint: "chrome" }, reality: { enabled: true, public_key: "A".repeat(43), short_id: "0123abcd" } } },
    { type: "direct", tag: "direct" },
    { type: "block", tag: "block" },
    { type: "dns", tag: "dns-out" },
  ],
  route: { rules: [{ protocol: "dns", outbound: "dns-out" }], final: "proxy" },
};
const marzban = createServer((req, res) => {
  res.setHeader("Content-Type", "application/json");
  res.end(req.url?.startsWith("/sub/") ? JSON.stringify(marzbanSub) : "{}");
}).listen(0, "127.0.0.1");
await new Promise((r) => marzban.once("listening", r));

Object.assign(process.env, {
  DATABASE_PATH: join(dir, "test.db"),
  TELEGRAM_ID_SALT: randomBytes(32).toString("hex"),
  MARZBAN_API_URL: `http://127.0.0.1:${(marzban.address() as AddressInfo).port}`,
  CDN_SOURCE_DOMAIN: CDN,
  CDN_CLEAN_DOMAIN: "go.example.org",
  CDN_BACKUP_DOMAIN: "go2.example.org",
  WORKER_RELAY_DOMAIN: "relay.example.workers.dev",
  ORIGIN_HOST: "origin.example.org",
  PUBLIC_SERVER_IP: "203.0.113.10",
  CDN_WS_PATH: "/ws",
  CDN_HU_PATH: "/hu",
  SHADOWTLS_DOMAIN: "st.example.org",
  DIRECT_TLS_DOMAIN: "direct.example.org",
  SNI_ROUTER_PORT: "443",
  HYSTERIA2_PORT: "8445",
  TUIC_PORT: "8446",
  TROJAN_PORT: "8447",
  DNSTT_TUNNEL_DOMAIN: "t.example.org",
});

const raw = new Database(process.env.DATABASE_PATH);
migrate(drizzle(raw), { migrationsFolder: "./drizzle" });
raw.close();

const { db } = await import("../src/db/index.js");
const { users } = await import("../src/db/schema.js");
const { initSettings, updateSettings } = await import("../src/settings.js");
const { webRoutes } = await import("../src/api/routes/web.js");
const { SingBoxClient } = await import("../src/singbox/client.js");

await initSettings();
await updateSettings({ "feature.shadowTls": "true", "feature.trojan": "true" });

const token = randomBytes(32).toString("hex");
await db.insert(users).values({
  telegramIdHash: randomBytes(16).toString("hex"),
  language: "en",
  webToken: token,
  marzbanUsername: "u1",
  marzbanSubUrl: "https://go.example.org/sub/abc123",
  shadowTlsUsername: "st_u1",
  shadowTlsPassword: randomBytes(16).toString("base64url"),
  shadowTlsSsPassword: randomBytes(16).toString("base64"),
  hysteria2Password: randomBytes(16).toString("base64url"),
  tuicUuid: randomUUID(),
  tuicPassword: randomBytes(16).toString("base64url"),
  trojanPassword: randomBytes(16).toString("base64url"),
  dnsttSocksUsername: "dn_u1",
  dnsttSocksPassword: randomBytes(16).toString("base64url"),
});

after(() => { marzban.close(); rmSync(dir, { recursive: true, force: true }); });

// ---------------------------------------------------------------- client profile
test("subscription: invariants of the unified sing-box profile", async () => {
  const res = await webRoutes.request(`/singbox?token=${token}`);
  assert.equal(res.status, 200);
  const cfg: any = await res.json();
  const out: any[] = cfg.outbounds;
  const byTag = (t: string) => out.find((o) => o.tag === t);

  // Legacy special outbounds are migrated to route actions.
  assert.ok(!out.some((o) => o.type === "block" || o.type === "dns"), "legacy block/dns outbounds remain");
  // httpupgrade can't pass Cloudflare from sing-box; HU-CDN is re-added as ws on the HU path.
  assert.ok(!out.some((o) => o.transport?.type === "httpupgrade"), "httpupgrade outbound remains");
  const hu = out.find((o) => o.tag?.startsWith("HU-CDN") && o.server === "go.example.org");
  assert.equal(hu?.transport?.type, "ws");
  assert.equal(hu?.transport?.path, "/hu");
  // Every CDN outbound gets a backup-domain twin, plus Cloudflare IP-override copies.
  assert.ok(out.some((o) => o.tag?.startsWith("WS-CDN2") && o.server === "go2.example.org"), "backup CDN outbound missing");
  assert.ok(out.filter((o) => /^CF\d/.test(o.tag)).length >= 8, "Cloudflare IP-override outbounds missing");
  // Direct protocols from the sing-box sidecar are injected.
  for (const t of ["ShadowTLS", "Trojan", "Hysteria2", "TUIC"]) assert.ok(byTag(t), `${t} outbound missing`);
  assert.equal(byTag("Trojan").server_port, 443, "Trojan must advertise the SNI-router port");
  // Tags are unique (sing-box refuses duplicate tags).
  const tags = out.map((o) => o.tag);
  assert.equal(new Set(tags).size, tags.length, "duplicate outbound tags");

  // Every host a client will connect to, present as SNI, or send as Host.
  const hosts = new Set<string>();
  for (const o of out) {
    for (const h of [o.server, o.tls?.server_name, o.transport?.headers?.Host, o.transport?.headers?.host, o.transport?.host]) {
      if (typeof h === "string") hosts.add(h);
    }
  }
  // No outbound uses the DNS-poisoned source CDN domain.
  assert.ok(!hosts.has(CDN), "source CDN domain leaked into the profile");
  // Direct protocols use the raw IP, never the origin hostname.
  assert.ok(!hosts.has("origin.example.org"), "origin hostname leaked into the profile");

  // ShadowTLS chaining: SS detours through the transport; the transport has no detour.
  const ss = byTag("ShadowTLS");
  const st = byTag("ShadowTLS-transport");
  assert.equal(ss?.detour, "ShadowTLS-transport");
  assert.ok(st && !st.detour, "ShadowTLS-transport must not have a detour");

  // dns-remote must be DoH (TCP-only chains can't carry UDP DNS).
  const remote = cfg.dns.servers.find((s: any) => s.tag === "dns-remote");
  assert.ok(remote, "dns-remote missing");
  assert.match(JSON.stringify(remote), /https|"type":"https"/, "dns-remote is not DoH");

  // Selector defaults to the CDN urltest and lists only real outbounds.
  const proxy = byTag("proxy");
  assert.equal(proxy.default, "auto (CDN)");
  assert.ok(!proxy.outbounds.includes("ShadowTLS-transport"), "transport detour exposed in selector");
  for (const t of proxy.outbounds) assert.ok(byTag(t), `selector references missing outbound ${t}`);
  assert.ok(out.some((o) => o.tag?.startsWith("WS-Worker") && o.server === "relay.example.workers.dev"), "Worker relay outbound missing");
  // Reality goes direct to the public IP and is not part of the CDN urltest.
  assert.equal(byTag("Reality (u1)").server, "203.0.113.10");
  assert.ok(!byTag("auto (CDN)").outbounds.includes("Reality (u1)"), "direct outbound probed by urltest");
});

test("subscription: rejects malformed and unknown tokens", async () => {
  assert.equal((await webRoutes.request("/singbox?token=short")).status, 401);
  assert.equal((await webRoutes.request(`/singbox?token=${"0".repeat(64)}`)).status, 404);
});

// ---------------------------------------------------------------- server config
test("server: sing-box sidecar config is valid", async () => {
  const configPath = join(dir, "sb", "config.json");
  const cert = join(dir, "cert.pem"), key = join(dir, "key.pem");
  execFileSync("openssl", ["req", "-x509", "-newkey", "ec", "-pkeyopt", "ec_paramgen_curve:prime256v1", "-nodes",
    "-keyout", key, "-out", cert, "-days", "1", "-subj", "/CN=st.example.org"], { stdio: "ignore" });
  const client = new SingBoxClient({
    domain: "st.example.org", port: 8444, handshakeServer: "www.example.com", strictMode: true,
    method: "2022-blake3-aes-128-gcm", configPath, hysteria2Port: 8445, tuicPort: 8446, trojanPort: 8447,
    tlsCertPath: cert, tlsKeyPath: key, sniRouterPort: 443, directTlsDomain: "direct.example.org",
    directTlsCertPath: cert, directTlsKeyPath: key, dnsttEnabled: true,
    containerName: "shadowshare-test-no-such-container",
  });
  await client.syncConfig();
  const cfg = JSON.parse(readFileSync(configPath, "utf8"));
  const types = cfg.inbounds.map((i: any) => i.type).sort();
  assert.deepEqual(types, ["hysteria2", "shadowsocks", "shadowtls", "socks", "socks", "trojan", "tuic"]);
  // The seeded user's credentials made it in (sync after DB insert).
  assert.ok(JSON.stringify(cfg).includes("st_u1"), "seeded user missing from server config");

  const bin = process.env.SING_BOX_BIN;
  if (!bin) return; // `sing-box check` runs in CI, where the pinned binary is downloaded
  // The clash API binds 0.0.0.0:9090 in production; check doesn't need it.
  writeFileSync(configPath, JSON.stringify(cfg));
  execFileSync(bin, ["check", "-c", configPath], { stdio: "pipe" });
});
