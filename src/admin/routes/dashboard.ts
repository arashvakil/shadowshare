import { Hono } from "hono";
import { eq, count, desc } from "drizzle-orm";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { db } from "../../db/index.js";
import { users, usageSnapshots } from "../../db/schema.js";
import { marzban } from "../../marzban/instance.js";
import { config } from "../../config.js";

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

const dashboard = new Hono();

dashboard.get("/stats", async (c) => {
  const [totalResult] = await db.select({ count: count() }).from(users);
  const [activeResult] = await db
    .select({ count: count() })
    .from(users)
    .where(eq(users.isActive, true));

  const revokedUsers = totalResult.count - activeResult.count;

  let totalTransferBytes = 0;
  let totalTransferFormatted = "N/A";

  if (marzban) {
    try {
      const marzbanData = await marzban.getUsers(0, 500);
      for (const mu of marzbanData.users) {
        totalTransferBytes += mu.lifetime_used_traffic || 0;
      }
    } catch {
      // Marzban may not be available
    }
  }

  totalTransferFormatted = formatBytes(totalTransferBytes);

  const killFlag = resolve(config.databasePath, "..", ".killed");
  const isKilled = existsSync(killFlag);

  return c.json({
    totalUsers: totalResult.count,
    activeUsers: activeResult.count,
    revokedUsers,
    totalTransferBytes,
    totalTransferFormatted,
    isKilled,
  });
});

// Usage over time — returns snapshots grouped by timestamp
dashboard.get("/usage-history", async (c) => {
  const snapshots = await db
    .select()
    .from(usageSnapshots)
    .orderBy(desc(usageSnapshots.snapshotAt));

  // Group by snapshotAt, sum total bytes per snapshot, and per-key breakdown
  // Also collect stored labels from snapshots (for deleted users)
  const grouped = new Map<string, { total: number; byKey: Record<string, number> }>();
  const snapshotLabels: Record<string, string> = {};

  for (const s of snapshots) {
    const ts = s.snapshotAt;
    if (!grouped.has(ts)) {
      grouped.set(ts, { total: 0, byKey: {} });
    }
    const g = grouped.get(ts)!;
    g.total += s.bytesTransferred;
    g.byKey[s.outlineKeyId] = s.bytesTransferred;

    // Keep the most recent label per key from snapshot data
    if (s.keyLabel && !snapshotLabels[s.outlineKeyId]) {
      snapshotLabels[s.outlineKeyId] = s.keyLabel;
    }
  }

  // Build snapshot-key → label mapping: current users take priority, then
  // snapshot-stored labels. Snapshots are keyed by Marzban username (the
  // snapshot key, stored in the legacy-named outline_key_id column).
  const allUsers = await db.select().from(users);
  const keyLabels: Record<string, string> = { ...snapshotLabels };
  for (const u of allUsers) {
    if (u.marzbanUsername) {
      keyLabels[u.marzbanUsername] = u.referralCode || u.telegramIdHash.slice(0, 8);
    }
  }

  // Convert to sorted array (oldest first)
  const history = Array.from(grouped.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([ts, data]) => ({ timestamp: ts, ...data }));

  return c.json({ history, keyLabels });
});

// Worker analytics — fetch from Cloudflare GraphQL API
dashboard.get("/worker-analytics", async (c) => {
  if (!config.cloudflareApiKey || !config.cloudflareEmail || !config.cloudflareAccountId) {
    return c.json({ error: "Cloudflare API not configured" }, 404);
  }

  try {
    // Query last 7 days
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const dateTo = now.toISOString().slice(0, 10);
    const dateFrom = weekAgo.toISOString().slice(0, 10);

    const query = `{
      viewer {
        accounts(filter: {accountTag: "${config.cloudflareAccountId}"}) {
          workersInvocationsAdaptive(limit: 30, filter: {date_geq: "${dateFrom}", date_leq: "${dateTo}"}) {
            sum { requests errors subrequests }
            dimensions { date scriptName }
          }
        }
      }
    }`;

    const res = await fetch("https://api.cloudflare.com/client/v4/graphql", {
      method: "POST",
      headers: {
        "X-Auth-Email": config.cloudflareEmail,
        "X-Auth-Key": config.cloudflareApiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query }),
    });

    if (!res.ok) {
      return c.json({ error: `Cloudflare API error ${res.status}` }, 502);
    }

    const data = await res.json() as any;
    const rows = data?.data?.viewer?.accounts?.[0]?.workersInvocationsAdaptive || [];

    // Aggregate by date
    const daily: Array<{ date: string; requests: number; errors: number }> = [];
    let totalRequests = 0;
    let totalErrors = 0;
    let todayRequests = 0;

    for (const row of rows) {
      daily.push({
        date: row.dimensions.date,
        requests: row.sum.requests,
        errors: row.sum.errors,
      });
      totalRequests += row.sum.requests;
      totalErrors += row.sum.errors;
      if (row.dimensions.date === dateTo) {
        todayRequests += row.sum.requests;
      }
    }

    // Sort by date
    daily.sort((a, b) => a.date.localeCompare(b.date));

    return c.json({
      daily,
      totalRequests,
      totalErrors,
      todayRequests,
      dailyLimit: 100000,
      todayPct: Math.round((todayRequests / 100000) * 1000) / 10,
    });
  } catch (err) {
    console.error("[admin] Worker analytics error:", err);
    return c.json({ error: "Failed to fetch Worker analytics" }, 500);
  }
});

export { dashboard as dashboardRoutes };
