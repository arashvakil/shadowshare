import { desc, eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { users, usageSnapshots } from "../db/schema.js";
import { marzban } from "../marzban/instance.js";
import { getWgPeerStats } from "../amneziawg/wg-stats.js";
import { countContainerTcpConnections } from "../docker/stats.js";
import { config } from "../config.js";
import { getNumber } from "../settings.js";

async function getLastSnapshots(): Promise<Map<string, number>> {
  // Get the most recent snapshot per key
  const all = await db
    .select()
    .from(usageSnapshots)
    .orderBy(desc(usageSnapshots.snapshotAt));

  const last = new Map<string, number>();
  for (const s of all) {
    if (!last.has(s.outlineKeyId)) {
      last.set(s.outlineKeyId, s.bytesTransferred);
    }
  }
  return last;
}

async function takeSnapshot() {
  try {
    const allUsers = await db.select().from(users);
    const lastSnapshots = await getLastSnapshots();

    // Fetch Marzban traffic per user
    const marzbanTraffic = new Map<string, number>();
    if (marzban) {
      for (const u of allUsers) {
        if (!u.marzbanUsername) continue;
        try {
          const mUser = await marzban.getUser(u.marzbanUsername);
          if (mUser.used_traffic > 0) {
            marzbanTraffic.set(u.marzbanUsername, mUser.used_traffic);
          }
        } catch {
          // User may not exist in Marzban
        }
      }
    }

    // sing-box (ShadowTLS/Hysteria2/TUIC/Trojan) and DNSTT share one inbound
    // with NO per-user accounting — only an aggregate server total is available.
    // We deliberately do NOT distribute that total across users: an even split
    // produced identical per-user figures and bumped everyone's lastActiveAt on
    // every run. Only genuinely per-user sources (Marzban, AmneziaWG) are recorded.

    // Fetch AmneziaWG per-user traffic — match peer public key to user's amneziaWgPeerId
    const awgPerUserMap = new Map<string, number>(); // peerId (publicKey) → bytes
    const awgUsers = allUsers.filter((u) => u.amneziaWgPeerId);
    if (awgUsers.length > 0) {
      try {
        const peerStats = await getWgPeerStats();
        for (const peer of peerStats) {
          const bytes = peer.transferRx + peer.transferTx;
          if (bytes > 0) {
            awgPerUserMap.set(peer.publicKey, bytes);
          }
        }
      } catch (err) {
        console.error("Usage snapshot: AWG traffic failed:", err);
      }
    }

    // Fetch NPV Tunnel aggregate traffic from dnstm container SSH connections
    // NPV uses shared credentials — no per-user field in DB, so we track
    // active SSH connection count as a service-level metric only.
    // Bytes are not attributed to individual users.
    let npvConnections = 0;
    try {
      npvConnections = await countContainerTcpConnections(config.dnstmContainerName, 2222);
    } catch (err) {
      console.error("Usage snapshot: NPV connection count failed:", err);
    }
    if (npvConnections > 0) {
      console.log(`Usage snapshot: NPV Tunnel has ${npvConnections} active SSH connections`);
    }

    // Per-user bytes = genuinely-attributable sources only (Marzban + AmneziaWG).
    const perUserBytes = (u: typeof allUsers[number]) => {
      const marzbanBytes = u.marzbanUsername ? (marzbanTraffic.get(u.marzbanUsername) || 0) : 0;
      const awgBytes = u.amneziaWgPeerId ? (awgPerUserMap.get(u.amneziaWgPeerId) || 0) : 0;
      return marzbanBytes + awgBytes;
    };

    const rows = allUsers
      .filter((u) => {
        if (u.marzbanUsername && marzbanTraffic.has(u.marzbanUsername)) return true;
        if (u.amneziaWgPeerId && awgPerUserMap.has(u.amneziaWgPeerId)) return true;
        return false;
      })
      .map((u) => {
        const current = perUserBytes(u);

        // Snapshot key: Marzban username (stored in the legacy outline_key_id column).
        const snapshotKey = u.marzbanUsername || `user:${u.id}`;
        const last = lastSnapshots.get(snapshotKey) ?? 0;

        // If current < last, a server restarted and counters reset.
        // Carry forward the previous value so history isn't lost.
        const adjusted = current < last ? last + current : current;

        return {
          outlineKeyId: snapshotKey,
          bytesTransferred: adjusted,
          keyLabel: u.referralCode || u.telegramIdHash.slice(0, 8),
        };
      });

    if (rows.length > 0) {
      await db.insert(usageSnapshots).values(rows);
    }

    // Update lastKnownBandwidth and lastActiveAt per user
    const now = new Date().toISOString();
    for (const u of allUsers) {
      const currentBytes = perUserBytes(u);
      if (currentBytes === 0 && u.lastKnownBandwidth === 0) continue;

      const updates: Record<string, unknown> = { lastKnownBandwidth: currentBytes };
      if (currentBytes > u.lastKnownBandwidth) {
        updates.lastActiveAt = now;
      }
      await db.update(users).set(updates).where(eq(users.id, u.id));
    }

    console.log(`Usage snapshot: ${rows.length} keys recorded`);
  } catch (err) {
    console.error("Usage snapshot failed:", err);
  }
}

function scheduleNext() {
  const intervalMs = getNumber("bot.snapshotIntervalHrs") * 60 * 60 * 1000;
  setTimeout(async () => {
    await takeSnapshot();
    scheduleNext();
  }, intervalMs);
}

export function startUsageSnapshots() {
  // Take one immediately on startup, then self-reschedule
  takeSnapshot();
  scheduleNext();
}
