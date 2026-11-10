import { db } from "../db/index.js";
import { connectivityEvents } from "../db/schema.js";
import { getNumber } from "../settings.js";

interface SnapshotRow {
  userId: number;
  provider: string;
  isOnline: boolean;
}

/**
 * Compare the latest two snapshots to detect mass disconnects, protocol blocks, and mass reconnects.
 * Called at the end of each connectivity poll.
 */
export async function analyzeDisconnects(
  currentSnapshot: SnapshotRow[],
  previousSnapshot: SnapshotRow[],
): Promise<void> {
  if (previousSnapshot.length === 0 || currentSnapshot.length === 0) return;

  const thresholdPct = getNumber("bot.disconnectThresholdPct");
  const minUsers = 3;

  // Build maps: userId → isOnline (any provider)
  const prevOnlineUsers = new Set<number>();
  const currOnlineUsers = new Set<number>();
  const prevOnlineByProvider = new Map<string, Set<number>>();
  const currOnlineByProvider = new Map<string, Set<number>>();

  for (const s of previousSnapshot) {
    if (s.isOnline) {
      prevOnlineUsers.add(s.userId);
      if (!prevOnlineByProvider.has(s.provider)) prevOnlineByProvider.set(s.provider, new Set());
      prevOnlineByProvider.get(s.provider)!.add(s.userId);
    }
  }

  for (const s of currentSnapshot) {
    if (s.isOnline) {
      currOnlineUsers.add(s.userId);
      if (!currOnlineByProvider.has(s.provider)) currOnlineByProvider.set(s.provider, new Set());
      currOnlineByProvider.get(s.provider)!.add(s.userId);
    }
  }

  // Mass disconnect: users who were online → now offline
  const disconnected = [...prevOnlineUsers].filter((id) => !currOnlineUsers.has(id));
  const reconnected = [...currOnlineUsers].filter((id) => !prevOnlineUsers.has(id));

  if (disconnected.length >= minUsers && prevOnlineUsers.size > 0) {
    const pct = (disconnected.length / prevOnlineUsers.size) * 100;
    if (pct >= thresholdPct) {
      await db.insert(connectivityEvents).values({
        eventType: "mass_disconnect",
        severity: "critical",
        affectedCount: disconnected.length,
        totalActive: prevOnlineUsers.size,
        affectedProtocols: JSON.stringify([...prevOnlineByProvider.keys()]),
        details: JSON.stringify({ affectedUserIds: disconnected.slice(0, 100), percentOffline: Math.round(pct) }),
      });
      console.log(`[disconnect-analyzer] CRITICAL: Mass disconnect — ${disconnected.length}/${prevOnlineUsers.size} users went offline (${Math.round(pct)}%)`);
    }
  }

  // Protocol block: all users on one provider went offline but other providers are fine
  for (const [provider, prevUsers] of prevOnlineByProvider) {
    const currUsers = currOnlineByProvider.get(provider);
    const prevCount = prevUsers.size;
    const currCount = currUsers?.size || 0;

    if (prevCount >= minUsers && currCount === 0) {
      // Check that at least one other provider still has online users
      const otherProvidersOnline = [...currOnlineByProvider.entries()]
        .filter(([p]) => p !== provider)
        .some(([, users]) => users.size > 0);

      if (otherProvidersOnline) {
        await db.insert(connectivityEvents).values({
          eventType: "protocol_block",
          severity: "warning",
          affectedCount: prevCount,
          totalActive: prevOnlineUsers.size,
          affectedProtocols: JSON.stringify([provider]),
          details: JSON.stringify({ provider, previousOnline: prevCount }),
        });
        console.log(`[disconnect-analyzer] WARNING: Protocol block — all ${prevCount} ${provider} users went offline`);
      }
    }
  }

  // Mass reconnect
  if (reconnected.length >= minUsers) {
    await db.insert(connectivityEvents).values({
      eventType: "mass_reconnect",
      severity: "info",
      affectedCount: reconnected.length,
      totalActive: currOnlineUsers.size,
      affectedProtocols: JSON.stringify([...currOnlineByProvider.keys()]),
      details: JSON.stringify({ reconnectedUserIds: reconnected.slice(0, 100) }),
    });
    console.log(`[disconnect-analyzer] INFO: Mass reconnect — ${reconnected.length} users came back online`);
  }
}
