// Seeds a throwaway database with a fictional invite tree for README screenshots.
// Every name, host and credential here is made up. Run via scripts/screenshots/capture.ts.
import { writeFileSync } from "node:fs";
import { db } from "../../src/db/index.js";
import { users, settings, connectionSnapshots, connectivityEvents } from "../../src/db/schema.js";

const DAY = 86_400_000;
const NOW = Date.now();
const iso = (msAgo: number) => new Date(NOW - msAgo).toISOString();

// Deterministic pseudo-random so screenshots don't churn between runs.
let seed = 42;
const rand = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
const hex = (n: number) => Array.from({ length: n }, () => Math.floor(rand() * 256).toString(16).padStart(2, "0")).join("");

const NAMES = [
  "Operator", "Sara", "Reza", "Maryam", "Ali", "Neda", "Kian", "Shirin", "Omid", "Leila",
  "Babak", "Parisa", "Arman", "Yasmin", "Dariush", "Mina", "Farhad", "Roya", "Navid", "Golnar",
  "Saman", "Tara", "Behnam", "Azadeh", "Kaveh", "Nasrin", "Pouya", "Elham", "Hamed", "Setareh",
  "Ramin", "Laleh", "Siavash", "Mahsa", "Fereshteh", "Payam", "Hedieh",
];

type Row = typeof users.$inferInsert;
const rows: Row[] = [];
// Tree: the operator invites 5, each of those invites a few, and so on.
const parents: number[] = [];
for (let i = 0; i < NAMES.length; i++) {
  const parent = i === 0 ? null : i <= 5 ? 1 : parents[Math.floor(rand() * parents.length)];
  const createdDaysAgo = i === 0 ? 120 : Math.round(110 - i * 2.6 + rand() * 4);
  const activeBucket = rand();
  const lastActiveAt =
    i === 0 || activeBucket < 0.55 ? iso(rand() * 6 * 3600_000)        // active today
    : activeBucket < 0.75 ? iso((1 + rand() * 5) * DAY)                  // this week
    : activeBucket < 0.9 ? iso((8 + rand() * 20) * DAY)                  // this month
    : null;                                                              // never connected
  rows.push({
    telegramIdHash: hex(32),
    label: NAMES[i],
    marzbanUsername: `demo_${i + 1}`,
    marzbanSubUrl: `https://go.example.org/sub/${hex(16)}`,
    referralCode: hex(4),
    referredBy: parent,
    referralCount: 0,
    maxReferrals: i === 0 ? 10000 : 10,
    webToken: hex(32),
    language: i % 3 === 0 ? "en" : i % 3 === 1 ? "fa" : "pi",
    isActive: i !== 17,
    lastKnownBandwidth: lastActiveAt ? Math.round(rand() * 38e9) : 0,
    lastActiveAt,
    createdAt: iso(createdDaysAgo * DAY),
  });
  if (i <= 20) parents.push(i + 1);
}
for (const r of rows) if (r.referredBy) rows[r.referredBy - 1].referralCount! += 1;

await db.insert(users).values(rows);

// Admin-created invite links (seed users with no VPN account until redeemed).
await db.insert(users).values([
  ["Family group", 6, 3], ["University friends", 10, 7], ["Book club", 5, 1],
].map(([label, max, used], k) => ({
  telegramIdHash: `admin-seed-${hex(8)}`, label: label as string, referralCode: hex(4),
  maxReferrals: max as number, referralCount: used as number, isActive: true, language: "en" as const,
  createdAt: iso((3 + k * 9) * DAY),
})));

// Online/bandwidth history for the monitoring and users pages.
const snaps: (typeof connectionSnapshots.$inferInsert)[] = [];
for (let u = 1; u <= rows.length; u++) {
  if (!rows[u - 1].lastActiveAt) continue;
  let bytes = 0;
  for (let h = 48; h >= 0; h -= 2) {
    const online = rand() < 0.45 ? 1 : 0;
    bytes += online ? Math.round(rand() * 6e8) : 0;
    snaps.push({ userId: u, provider: "marzban", isOnline: online, bytesTransferred: bytes, snapshotAt: iso(h * 3600_000) });
  }
}
await db.insert(connectionSnapshots).values(snaps);

await db.insert(connectivityEvents).values([
  { eventType: "protocol_degraded", severity: "warning", affectedCount: 4, totalActive: 21, affectedProtocols: "Reality", details: "Reality handshakes failing for 4 of 21 active users", createdAt: iso(26 * 3600_000) },
  { eventType: "recovered", severity: "info", affectedCount: 0, totalActive: 22, affectedProtocols: "Reality", details: "Reality recovered", createdAt: iso(23 * 3600_000) },
]);

const now = new Date(NOW).toISOString();
const set = (key: string, value: string, type: "string" | "number" | "boolean", category: "bot" | "feature" | "service" | "web") =>
  ({ key, value, type, category, updatedAt: now });
await db.insert(settings).values([
  set("web.appDomain", "https://go.example.org/app", "string", "web"),
  set("web.communityLink", "https://t.me/example_community", "string", "web"),
  set("feature.shadowTls", "true", "boolean", "feature"),
  set("feature.trojan", "true", "boolean", "feature"),
  set("feature.dnstt", "true", "boolean", "feature"),
  set("feature.npvTunnel", "true", "boolean", "feature"),
  set("feature.mtprotoProxy", "true", "boolean", "feature"),
  set("feature.registrationOpen", "true", "boolean", "feature"),
]);

// Per-user traffic for the fake Marzban API started by server.ts.
writeFileSync(process.env.DEMO_MARZBAN_JSON!, JSON.stringify(rows.map((r) => ({
  username: r.marzbanUsername,
  status: r.isActive ? "active" : "disabled",
  used_traffic: r.lastKnownBandwidth,
  lifetime_used_traffic: r.lastKnownBandwidth,
  data_limit: null, expire: null,
  online_at: r.lastActiveAt ?? null,
  sub_last_user_agent: r.lastActiveAt ? "SFI/1.11.4" : null,
  subscription_url: r.marzbanSubUrl, links: [], created_at: r.createdAt,
}))));

console.log(`seeded ${rows.length} users, ${snaps.length} snapshots`);
