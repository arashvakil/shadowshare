import { Hono } from "hono";
import { eq, desc, gte, and, sql, asc } from "drizzle-orm";
import { db } from "../../db/index.js";
import { connectionSnapshots, connectivityEvents, users, dnsResolvers, masterdnsUsageHistory } from "../../db/schema.js";
import { clashApi } from "../../singbox/clash-api.js";
import { getContainerNetworkStats, countContainerTcpConnections } from "../../docker/stats.js";
import { config } from "../../config.js";
import { refreshResolvers, scanStats } from "../../jobs/scan-dns-resolvers.js";

const monitoringRouter = new Hono();

// Current per-provider connectivity status
monitoringRouter.get("/connectivity", async (c) => {
  // Get the most recent snapshot timestamp
  const latestRow = await db
    .select({ snapshotAt: connectionSnapshots.snapshotAt })
    .from(connectionSnapshots)
    .orderBy(desc(connectionSnapshots.snapshotAt))
    .limit(1);

  if (latestRow.length === 0) {
    return c.json({ providers: [], lastPoll: null });
  }

  const lastPoll = latestRow[0].snapshotAt;

  // Get all snapshots at the latest timestamp
  const latest = await db
    .select()
    .from(connectionSnapshots)
    .where(eq(connectionSnapshots.snapshotAt, lastPoll));

  // Group by provider
  const providerMap = new Map<string, { online: number; offline: number; total: number }>();
  for (const snap of latest) {
    if (!providerMap.has(snap.provider)) {
      providerMap.set(snap.provider, { online: 0, offline: 0, total: 0 });
    }
    const p = providerMap.get(snap.provider)!;
    p.total++;
    if (snap.isOnline) p.online++;
    else p.offline++;
  }

  const providers = [...providerMap.entries()].map(([provider, stats]) => {
    const pct = stats.total > 0 ? (stats.online / stats.total) * 100 : 0;
    let health: "green" | "yellow" | "red";
    if (pct > 50) health = "green";
    else if (pct >= 10) health = "yellow";
    else health = "red";

    return {
      provider,
      onlineCount: stats.online,
      offlineCount: stats.offline,
      totalUsers: stats.total,
      health,
    };
  });

  return c.json({ providers, lastPoll });
});

// Timeline data for charts
monitoringRouter.get("/timeline", async (c) => {
  const hours = parseInt(c.req.query("hours") || "24", 10);
  const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

  const snapshots = await db
    .select()
    .from(connectionSnapshots)
    .where(gte(connectionSnapshots.snapshotAt, since))
    .orderBy(connectionSnapshots.snapshotAt);

  // Group by timestamp → provider → online count
  const timeGroups = new Map<string, Map<string, number>>();
  for (const snap of snapshots) {
    if (!timeGroups.has(snap.snapshotAt)) {
      timeGroups.set(snap.snapshotAt, new Map());
    }
    const providers = timeGroups.get(snap.snapshotAt)!;
    if (!providers.has(snap.provider)) {
      providers.set(snap.provider, 0);
    }
    if (snap.isOnline) {
      providers.set(snap.provider, providers.get(snap.provider)! + 1);
    }
  }

  // Collect all providers
  const allProviders = new Set<string>();
  for (const provMap of timeGroups.values()) {
    for (const p of provMap.keys()) {
      allProviders.add(p);
    }
  }

  // Build series
  const timestamps = [...timeGroups.keys()].sort();
  const series: Record<string, number[]> = {};
  for (const provider of allProviders) {
    series[provider] = timestamps.map((t) => timeGroups.get(t)?.get(provider) || 0);
  }

  return c.json({ timestamps, series });
});

// Recent connectivity events
monitoringRouter.get("/events", async (c) => {
  const limit = Math.min(parseInt(c.req.query("limit") || "50", 10), 200);

  const events = await db
    .select()
    .from(connectivityEvents)
    .orderBy(desc(connectivityEvents.createdAt))
    .limit(limit);

  return c.json(events);
});

// Per-user connection history (last 48h)
monitoringRouter.get("/user/:id", async (c) => {
  const userId = parseInt(c.req.param("id"), 10);
  const since = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();

  const history = await db
    .select()
    .from(connectionSnapshots)
    .where(
      and(
        eq(connectionSnapshots.userId, userId),
        gte(connectionSnapshots.snapshotAt, since),
      ),
    )
    .orderBy(connectionSnapshots.snapshotAt);

  return c.json(history);
});

// DNS tunnel (DNSTT/Slipstream) live stats — queries sing-box Clash API on demand
monitoringRouter.get("/dnstt", async (c) => {
  try {
    const res = await fetch("http://singbox:9090/connections");
    const data = await res.json() as {
      connections: Array<{
        id: string;
        metadata: {
          inbound: string;
          inboundType: string;
          sourceIP: string;
          destinationIP: string;
          destinationPort: string;
          host: string;
          network: string;
        };
        upload: number;
        download: number;
        start: string;
        chains: string[];
        rule: string;
        rulePayload: string;
      }>;
      uploadTotal: number;
      downloadTotal: number;
      memory: number;
    };

    const dnsttConns = (data.connections || []).filter(
      (conn) => conn.metadata?.inbound === "socks-dnstt-in",
    );

    // Look up usernames from DB for active SOCKS users
    const activeUsers = await db
      .select({
        id: users.id,
        referralCode: users.referralCode,
        socksUsername: users.dnsttSocksUsername,
      })
      .from(users)
      .where(sql`${users.dnsttSocksUsername} IS NOT NULL`);

    const usernameMap = new Map(
      activeUsers.map((u) => [u.socksUsername, u.referralCode || `user-${u.id}`]),
    );

    // Aggregate per source IP
    const bySource = new Map<string, { upload: number; download: number; count: number; destinations: string[]; since: string }>();
    for (const conn of dnsttConns) {
      const src = conn.metadata.sourceIP;
      if (!bySource.has(src)) {
        bySource.set(src, { upload: 0, download: 0, count: 0, destinations: [], since: conn.start });
      }
      const entry = bySource.get(src)!;
      entry.upload += conn.upload;
      entry.download += conn.download;
      entry.count++;
      const dest = conn.metadata.host || `${conn.metadata.destinationIP}:${conn.metadata.destinationPort}`;
      if (entry.destinations.length < 5 && !entry.destinations.includes(dest)) {
        entry.destinations.push(dest);
      }
      if (conn.start < entry.since) entry.since = conn.start;
    }

    return c.json({
      active: dnsttConns.length,
      sources: [...bySource.entries()].map(([ip, s]) => ({
        ip,
        connections: s.count,
        upload: s.upload,
        download: s.download,
        destinations: s.destinations,
        since: s.since,
      })),
      totalUsers: activeUsers.length,
    });
  } catch (err) {
    return c.json({ error: "Failed to query sing-box API", detail: String(err) }, 500);
  }
});

// NPV Tunnel live stats — SSH connection count on dnstm container
monitoringRouter.get("/npv", async (c) => {
  if (!config.npvSshHost) {
    return c.json({ enabled: false, connections: 0, servers: [] });
  }

  try {
    const connections = await countContainerTcpConnections(config.dnstmContainerName, 2222);
    return c.json({
      enabled: true,
      connections,
      servers: config.npvServers.map((s) => ({ name: s.name, host: s.sshHost, port: s.sshPort })),
    });
  } catch (err) {
    return c.json({ error: "Failed to query NPV stats", detail: String(err) }, 500);
  }
});

// OpenVPN+Cloak live stats — container network bytes
monitoringRouter.get("/ovpn", async (c) => {
  if (!config.openvpnCloakEnabled) {
    return c.json({ enabled: false, totalBytes: 0, users: 0 });
  }

  try {
    const stats = await getContainerNetworkStats(config.cloakContainerName);
    const ovpnUserCount = await db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.isActive, true), sql`${users.ovpnCloakConfig} IS NOT NULL`))
      .then((rows) => rows.length);

    return c.json({
      enabled: true,
      totalBytes: stats ? stats.rxBytes + stats.txBytes : 0,
      rxBytes: stats?.rxBytes || 0,
      txBytes: stats?.txBytes || 0,
      users: ovpnUserCount,
    });
  } catch (err) {
    return c.json({ error: "Failed to query OpenVPN stats", detail: String(err) }, 500);
  }
});

// MTProto Proxy (mtg) live stats — container network bytes + active connections
monitoringRouter.get("/mtproto", async (c) => {
  if (!config.mtprotoSecret) {
    return c.json({ enabled: false, connections: 0, rxBytes: 0, txBytes: 0 });
  }

  try {
    const [stats, connections] = await Promise.all([
      getContainerNetworkStats(config.mtgContainerName),
      countContainerTcpConnections(config.mtgContainerName, 3128),
    ]);

    return c.json({
      enabled: true,
      connections,
      rxBytes: stats?.rxBytes || 0,
      txBytes: stats?.txBytes || 0,
      totalBytes: stats ? stats.rxBytes + stats.txBytes : 0,
    });
  } catch (err) {
    return c.json({ error: "Failed to query MTProto stats", detail: String(err) }, 500);
  }
});

// DNS resolver pool — current stored resolvers + manual refresh
monitoringRouter.get("/dns-resolvers", async (c) => {
  if (!config.dnsttTunnelDomain) {
    return c.json({ enabled: false, resolvers: [] });
  }
  const rows = await db
    .select()
    .from(dnsResolvers)
    .orderBy(asc(dnsResolvers.rank));
  return c.json({
    enabled: true,
    lastScanAt: scanStats.lastScanAt,
    bundledPoolSize: scanStats.bundledPoolSize,
    sampledCount: scanStats.sampledCount,
    resolvers: rows.map((r) => ({
      ip: r.ip,
      latencyMs: r.latencyMs,
      rank: r.rank,
      verifiedAt: r.verifiedAt,
    })),
  });
});

monitoringRouter.post("/dns-resolvers/refresh", async (c) => {
  if (!config.dnsttTunnelDomain) {
    return c.json({ error: "DNSTT not configured" }, 400);
  }
  try {
    await refreshResolvers();
    const rows = await db.select().from(dnsResolvers).orderBy(asc(dnsResolvers.rank));
    return c.json({ ok: true, count: rows.length, resolvers: rows.map((r) => ({ ip: r.ip, rank: r.rank })) });
  } catch (err) {
    return c.json({ error: "Refresh failed", detail: String(err) }, 500);
  }
});

// MasterDNS Tunnel live stats — sing-box socks-masterdns-in inbound + container stats
monitoringRouter.get("/masterdns", async (c) => {
  try {
    const [conns, dnstmStats, singboxStats] = await Promise.all([
      clashApi.getActiveConnections(),
      getContainerNetworkStats(config.dnstmContainerName),
      getContainerNetworkStats(config.singboxContainerName),
    ]);

    const masterDnsConns = (conns || []).filter(
      (conn) => conn.metadata?.inbound === "socks-masterdns-in",
    );

    let upload = 0;
    let download = 0;
    const destCounts = new Map<string, number>();
    for (const conn of masterDnsConns) {
      upload += conn.upload || 0;
      download += conn.download || 0;
      const dest = conn.metadata.host || `${conn.metadata.destinationIP}:${conn.metadata.destinationPort}`;
      destCounts.set(dest, (destCounts.get(dest) || 0) + 1);
    }

    const topDestinations = [...destCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([host, count]) => ({ host, count }));

    return c.json({
      enabled: true,
      active: masterDnsConns.length,
      upload,
      download,
      totalBytes: upload + download,
      topDestinations,
      dnstm: dnstmStats
        ? { rxBytes: dnstmStats.rxBytes, txBytes: dnstmStats.txBytes, totalBytes: dnstmStats.rxBytes + dnstmStats.txBytes }
        : null,
      singbox: singboxStats
        ? { rxBytes: singboxStats.rxBytes, txBytes: singboxStats.txBytes, totalBytes: singboxStats.rxBytes + singboxStats.txBytes }
        : null,
    });
  } catch (err) {
    return c.json({ error: "Failed to query MasterDNS stats", detail: String(err) }, 500);
  }
});

// MasterDNS historical snapshots — for the chart
monitoringRouter.get("/masterdns/history", async (c) => {
  const hours = Math.min(parseInt(c.req.query("hours") || "24", 10), 24 * 30);
  const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

  const rows = await db
    .select()
    .from(masterdnsUsageHistory)
    .where(gte(masterdnsUsageHistory.snapshotAt, since))
    .orderBy(asc(masterdnsUsageHistory.snapshotAt));

  // Compute per-interval throughput (bytes/sec) by diffing cumulative byte counters.
  // Reset detection: if a counter goes down (container restart), treat delta as 0.
  const points: Array<{
    t: string;
    sessions: number;
    uploadBps: number;
    downloadBps: number;
    dnstmBps: number;
    singboxBps: number;
  }> = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    let uploadBps = 0;
    let downloadBps = 0;
    let dnstmBps = 0;
    let singboxBps = 0;

    if (i > 0) {
      const prev = rows[i - 1];
      const dtSec = Math.max(
        1,
        (new Date(row.snapshotAt).getTime() - new Date(prev.snapshotAt).getTime()) / 1000,
      );
      const upDelta = row.uploadBytesTotal - prev.uploadBytesTotal;
      const downDelta = row.downloadBytesTotal - prev.downloadBytesTotal;
      const dnstmDelta = (row.dnstmRxBytes + row.dnstmTxBytes) - (prev.dnstmRxBytes + prev.dnstmTxBytes);
      const sbDelta = (row.singboxRxBytes + row.singboxTxBytes) - (prev.singboxRxBytes + prev.singboxTxBytes);
      uploadBps = upDelta > 0 ? upDelta / dtSec : 0;
      downloadBps = downDelta > 0 ? downDelta / dtSec : 0;
      dnstmBps = dnstmDelta > 0 ? dnstmDelta / dtSec : 0;
      singboxBps = sbDelta > 0 ? sbDelta / dtSec : 0;
    }

    points.push({
      t: row.snapshotAt,
      sessions: row.activeSessions,
      uploadBps: Math.round(uploadBps),
      downloadBps: Math.round(downloadBps),
      dnstmBps: Math.round(dnstmBps),
      singboxBps: Math.round(singboxBps),
    });
  }

  return c.json({ hours, points });
});

export { monitoringRouter as monitoringRoutes };
