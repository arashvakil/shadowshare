import { lt } from "drizzle-orm";
import { db } from "../db/index.js";
import { masterdnsUsageHistory } from "../db/schema.js";
import { clashApi } from "../singbox/clash-api.js";
import { getContainerNetworkStats } from "../docker/stats.js";
import { config } from "../config.js";

const SNAPSHOT_INTERVAL_MS = 5 * 60 * 1000;
const RETENTION_MS = 30 * 24 * 60 * 60 * 1000;

async function takeSnapshot() {
  try {
    const conns = await clashApi.getActiveConnections();
    const masterDnsConns = conns.filter(
      (c) => c.metadata?.inbound === "socks-masterdns-in",
    );

    let upload = 0;
    let download = 0;
    for (const c of masterDnsConns) {
      upload += c.upload || 0;
      download += c.download || 0;
    }

    const [dnstmStats, singboxStats] = await Promise.all([
      getContainerNetworkStats(config.dnstmContainerName),
      getContainerNetworkStats(config.singboxContainerName),
    ]);

    await db.insert(masterdnsUsageHistory).values({
      activeSessions: masterDnsConns.length,
      uploadBytesTotal: upload,
      downloadBytesTotal: download,
      dnstmRxBytes: dnstmStats?.rxBytes || 0,
      dnstmTxBytes: dnstmStats?.txBytes || 0,
      singboxRxBytes: singboxStats?.rxBytes || 0,
      singboxTxBytes: singboxStats?.txBytes || 0,
    });

    const cutoff = new Date(Date.now() - RETENTION_MS).toISOString();
    await db
      .delete(masterdnsUsageHistory)
      .where(lt(masterdnsUsageHistory.snapshotAt, cutoff));
  } catch (err) {
    console.error("[masterdns-snapshot] failed:", err);
  }
}

export function startMasterdnsSnapshots() {
  takeSnapshot();
  setInterval(takeSnapshot, SNAPSHOT_INTERVAL_MS);
}
