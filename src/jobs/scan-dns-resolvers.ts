import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { readFile, unlink } from "node:fs/promises";
import { asc } from "drizzle-orm";
import { db } from "../db/index.js";
import { dnsResolvers } from "../db/schema.js";
import { config } from "../config.js";
import { getString } from "../settings.js";

const FINDNS_PATH = process.env.FINDNS_PATH || "/usr/local/bin/findns";
const BUNDLED_RESOLVERS_PATH = "/tmp/findns-bundled.txt";
/** Pre-seeded resolver list (from manual scanning inside Iran). Takes priority over findns bundled list. */
const SEEDED_RESOLVERS_PATH = process.env.SEEDED_RESOLVERS_PATH || "/app/data/iran-resolvers-seeded.txt";
const MAX_RESOLVERS_SEEDED = 50;
const MAX_RESOLVERS_BUNDLED = 5;
const REFRESH_INTERVAL_MS = 6 * 60 * 60 * 1000; // 6 hours

/** In-memory scan stats — reset on restart but scanner runs at startup anyway */
export const scanStats = {
  lastScanAt: null as string | null,
  bundledPoolSize: 0,
  sampledCount: 0,
};

const IP_RE = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/;
function isValidIp(s: string): boolean {
  return IP_RE.test(s);
}

/**
 * Load pre-seeded resolvers from a manually curated file (scanned from inside Iran).
 * These are higher quality than findns bundled list since they were recently verified.
 */
async function loadSeededResolvers(): Promise<string[]> {
  if (!existsSync(SEEDED_RESOLVERS_PATH)) return [];
  try {
    const raw = await readFile(SEEDED_RESOLVERS_PATH, "utf8");
    return raw.split("\n").map((s) => s.trim().replace(/:53$/, "")).filter((s) => s.length > 0 && isValidIp(s));
  } catch {
    return [];
  }
}

/**
 * Export the bundled pre-verified Iranian resolver list from findns.
 * These 7,854 IPs were verified to work for DNS tunneling from within Iran.
 * Returns array of IPs, or empty array if findns is unavailable.
 */
async function loadBundledResolvers(): Promise<string[]> {
  if (!existsSync(FINDNS_PATH)) return [];

  await new Promise<void>((resolve, reject) => {
    const proc = spawn(FINDNS_PATH, ["local", "-o", BUNDLED_RESOLVERS_PATH], {
      env: { PATH: "/usr/local/bin:/usr/bin:/bin" },
    });
    proc.on("close", (code) => (code === 0 ? resolve() : reject(new Error(`findns local exited ${code}`))));
    proc.on("error", reject);
  });

  const raw = await readFile(BUNDLED_RESOLVERS_PATH, "utf8");
  await unlink(BUNDLED_RESOLVERS_PATH).catch(() => {});
  return raw.split("\n").map((s) => s.trim()).filter((s) => s.length > 0 && isValidIp(s));
}

/** Fisher-Yates shuffle (in-place) */
function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export async function refreshResolvers(): Promise<void> {
  if (!config.dnsttTunnelDomain) return;

  console.log("[dns-scan] Refreshing Iranian DNS resolver pool...");
  const scanStart = new Date().toISOString();

  // Prefer pre-seeded resolvers (manually scanned, higher quality)
  let all = await loadSeededResolvers();
  let maxResolvers = MAX_RESOLVERS_SEEDED;
  let source = "seeded";

  if (all.length === 0) {
    // Fall back to findns bundled list
    all = await loadBundledResolvers();
    maxResolvers = MAX_RESOLVERS_BUNDLED;
    source = "bundled";
  }

  if (all.length === 0) {
    console.log("[dns-scan] No resolver sources available, skipping refresh");
    scanStats.lastScanAt = scanStart;
    scanStats.bundledPoolSize = 0;
    scanStats.sampledCount = 0;
    return;
  }

  // Pick a random sample from the pool
  const sample = shuffle([...all]).slice(0, maxResolvers);

  await db.delete(dnsResolvers);
  for (let i = 0; i < sample.length; i++) {
    await db.insert(dnsResolvers).values({
      ip: sample[i],
      latencyMs: null,
      ednsSize: null,
      rank: i + 1,
      verifiedAt: scanStart,
    });
  }

  scanStats.lastScanAt = scanStart;
  scanStats.bundledPoolSize = all.length;
  scanStats.sampledCount = sample.length;

  console.log(`[dns-scan] Stored ${sample.length} resolvers (sampled from ${all.length} ${source} pre-verified Iranian IPs)`);
}

function scheduleNext() {
  setTimeout(async () => {
    await refreshResolvers().catch((err) => console.error("[dns-scan] Refresh failed:", err));
    scheduleNext();
  }, REFRESH_INTERVAL_MS);
}

export function startDnsResolverScanner() {
  if (!config.dnsttTunnelDomain) return;
  refreshResolvers().catch((err) => console.error("[dns-scan] Initial refresh failed:", err));
  scheduleNext();
}

export async function getTopResolvers(limit = 3): Promise<Array<{ ip: string; latencyMs: number | null }>> {
  // Admin-configured resolvers take priority — validate each entry is a real IP
  const adminList = getString("service.dnsResolvers");
  if (adminList) {
    const ips = adminList
      .split(",")
      .map((s) => s.trim())
      .filter((s) => isValidIp(s));
    if (ips.length > 0) {
      return ips.slice(0, limit).map((ip) => ({ ip, latencyMs: null }));
    }
  }

  // Fall back to auto-scanned results
  const rows = await db
    .select()
    .from(dnsResolvers)
    .orderBy(asc(dnsResolvers.rank))
    .limit(limit);
  return rows.map((r) => ({ ip: r.ip, latencyMs: r.latencyMs }));
}
