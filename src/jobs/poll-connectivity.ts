import { eq, lt, desc } from "drizzle-orm";
import { db } from "../db/index.js";
import { users, connectionSnapshots } from "../db/schema.js";
import { marzban } from "../marzban/instance.js";
import { clashApi } from "../singbox/clash-api.js";
import { getWgPeerStats } from "../amneziawg/wg-stats.js";
import { getContainerNetworkStats, countContainerTcpConnections } from "../docker/stats.js";
import { config } from "../config.js";
import { getNumber } from "../settings.js";
import { analyzeDisconnects } from "./disconnect-analyzer.js";

// Store last bytes for delta comparison (online = bytes increased)
let lastCloakBytes = 0;

interface SnapshotEntry {
  userId: number;
  provider: string;
  isOnline: boolean;
  bytesTransferred: number;
}

async function pollConnectivity() {
  try {
    const activeUsers = await db
      .select()
      .from(users)
      .where(eq(users.isActive, true));

    if (activeUsers.length === 0) return;

    const entries: SnapshotEntry[] = [];

    // Collect from all providers in parallel
    const [marzbanResults, singboxResults, awgResults, ovpnResults, npvResults] = await Promise.all([
      collectMarzban(activeUsers),
      collectSingbox(activeUsers),
      collectAmneziawg(activeUsers),
      collectOvpnCloak(activeUsers),
      collectNpv(),
    ]);

    entries.push(...marzbanResults, ...singboxResults, ...awgResults, ...ovpnResults, ...npvResults);

    if (entries.length === 0) return;

    // Load previous snapshot for disconnect analysis
    const prevSnapshots = await getLatestSnapshots();

    // Write current snapshots
    const now = new Date().toISOString();
    await db.insert(connectionSnapshots).values(
      entries.map((e) => ({
        userId: e.userId,
        provider: e.provider,
        isOnline: e.isOnline ? 1 : 0,
        bytesTransferred: e.bytesTransferred,
        snapshotAt: now,
      })),
    );

    // Analyze disconnects
    const currentForAnalysis = entries.map((e) => ({
      userId: e.userId,
      provider: e.provider,
      isOnline: e.isOnline,
    }));
    await analyzeDisconnects(currentForAnalysis, prevSnapshots).catch((err) =>
      console.error("[poll-connectivity] Disconnect analysis failed:", err),
    );

    // Prune old snapshots
    const retentionDays = getNumber("bot.snapshotRetentionDays");
    const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000).toISOString();
    await db.delete(connectionSnapshots).where(lt(connectionSnapshots.snapshotAt, cutoff));

    console.log(`[poll-connectivity] Recorded ${entries.length} snapshots for ${activeUsers.length} users`);
  } catch (err) {
    console.error("[poll-connectivity] Poll failed:", err);
  }
}

async function getLatestSnapshots(): Promise<Array<{ userId: number; provider: string; isOnline: boolean }>> {
  // Get the most recent snapshot timestamp
  const latest = await db
    .select({ snapshotAt: connectionSnapshots.snapshotAt })
    .from(connectionSnapshots)
    .orderBy(desc(connectionSnapshots.snapshotAt))
    .limit(1);

  if (latest.length === 0) return [];

  // Get all snapshots at that timestamp (via grouping by snapshotAt desc)
  const rows = await db
    .select()
    .from(connectionSnapshots)
    .where(eq(connectionSnapshots.snapshotAt, latest[0].snapshotAt));

  return rows.map((r) => ({
    userId: r.userId,
    provider: r.provider,
    isOnline: r.isOnline === 1,
  }));
}

async function collectMarzban(activeUsers: typeof users.$inferSelect[]): Promise<SnapshotEntry[]> {
  if (!marzban) return [];
  try {
    const data = await marzban.getUsers(0, 500);
    const marzbanMap = new Map(data.users.map((u) => [u.username, u]));
    const fiveMinAgo = Date.now() - 5 * 60 * 1000;

    return activeUsers
      .filter((u) => u.marzbanUsername)
      .map((u) => {
        const mu = marzbanMap.get(u.marzbanUsername!);
        const isOnline = mu?.online_at ? new Date(mu.online_at).getTime() > fiveMinAgo : false;
        return {
          userId: u.id,
          provider: "marzban",
          isOnline,
          bytesTransferred: mu?.used_traffic || 0,
        };
      });
  } catch (err) {
    console.error("[poll-connectivity] Marzban collection failed:", err);
    return [];
  }
}

async function collectSingbox(activeUsers: typeof users.$inferSelect[]): Promise<SnapshotEntry[]> {
  try {
    const connections = await clashApi.getActiveConnections();
    if (connections.length === 0) {
      return [];
    }

    const singboxUsers = activeUsers.filter(
      (u) => u.shadowTlsUsername || u.hysteria2Password || u.tuicUuid || u.trojanPassword,
    );

    const totalBytes = connections.reduce((sum, c) => sum + c.download + c.upload, 0);

    const singboxInbounds = ["shadowtls-in", "ss-in", "hysteria2-in", "tuic-in", "trojan-in"];
    const hasSingboxActivity = connections.some((c) => c.chains.some((ch) => singboxInbounds.includes(ch)));

    if (!hasSingboxActivity) return [];

    return singboxUsers.map((u) => ({
      userId: u.id,
      provider: "singbox",
      isOnline: hasSingboxActivity,
      bytesTransferred: Math.round(totalBytes / singboxUsers.length),
    }));
  } catch (err) {
    console.error("[poll-connectivity] sing-box collection failed:", err);
    return [];
  }
}

async function collectAmneziawg(activeUsers: typeof users.$inferSelect[]): Promise<SnapshotEntry[]> {
  try {
    const peerStats = await getWgPeerStats();
    if (peerStats.length === 0) return [];

    // Build map of peer public key → stats
    const peerMap = new Map(peerStats.map((p) => [p.publicKey, p]));

    const awgUsers = activeUsers.filter((u) => u.amneziaWgPeerId);
    if (awgUsers.length === 0) return [];

    // Match users by their amneziaWgPeerId (which IS the client public key)
    return awgUsers.map((u) => {
      const peer = peerMap.get(u.amneziaWgPeerId!);
      return {
        userId: u.id,
        provider: "amneziawg",
        isOnline: peer?.isOnline ?? false,
        bytesTransferred: peer ? peer.transferRx + peer.transferTx : 0,
      };
    });
  } catch (err) {
    console.error("[poll-connectivity] AmneziaWG collection failed:", err);
    return [];
  }
}

/**
 * OpenVPN+Cloak: Get aggregate traffic from the cloak container.
 * All OVPN traffic flows through Cloak, so container network stats = OVPN user traffic.
 * Since all users share the same cert, we can only detect aggregate activity.
 */
async function collectOvpnCloak(activeUsers: typeof users.$inferSelect[]): Promise<SnapshotEntry[]> {
  const ovpnUsers = activeUsers.filter((u) => u.ovpnCloakConfig);
  if (ovpnUsers.length === 0) return [];

  try {
    const stats = await getContainerNetworkStats(config.cloakContainerName);
    if (!stats) return [];

    const currentBytes = stats.rxBytes + stats.txBytes;
    // Online if bytes increased since last poll (delta comparison)
    const isActive = currentBytes > lastCloakBytes;
    lastCloakBytes = currentBytes;

    return ovpnUsers.map((u) => ({
      userId: u.id,
      provider: "ovpn-cloak",
      isOnline: isActive,
      bytesTransferred: Math.round(currentBytes / ovpnUsers.length),
    }));
  } catch (err) {
    console.error("[poll-connectivity] OpenVPN+Cloak collection failed:", err);
    return [];
  }
}

/**
 * NPV Tunnel: Count active SSH connections on the dnstm container (port 2222).
 * NPV uses shared credentials — no per-user DB field — so we record a single
 * service-level entry with userId=0 to track the service health.
 * Note: SSH connections may include DNSTT-iOS (HTTP Injector) users too.
 */
async function collectNpv(): Promise<SnapshotEntry[]> {
  if (!config.npvSshHost) return [];

  try {
    const activeConns = await countContainerTcpConnections(config.dnstmContainerName, 2222);
    if (activeConns === 0) return [];

    // Record as a service-level metric (userId=0 is a sentinel for service stats)
    return [{
      userId: 0,
      provider: "npv-tunnel",
      isOnline: activeConns > 0,
      bytesTransferred: activeConns, // Store connection count in bytes field as a count metric
    }];
  } catch (err) {
    console.error("[poll-connectivity] NPV Tunnel collection failed:", err);
    return [];
  }
}

function scheduleNext() {
  const intervalMs = getNumber("bot.connectivityPollMins") * 60 * 1000;
  setTimeout(async () => {
    await pollConnectivity();
    scheduleNext();
  }, intervalMs);
}

export function startConnectivityPolling() {
  console.log("[poll-connectivity] Starting connectivity monitoring");
  // Delay first poll by 30 seconds to let services start
  setTimeout(() => {
    pollConnectivity();
    scheduleNext();
  }, 30000);
}
