import { config } from "../config.js";
import { dockerExec } from "./docker-exec.js";

export interface WgPeerStats {
  publicKey: string;
  latestHandshake: number; // epoch seconds
  transferRx: number;
  transferTx: number;
  isOnline: boolean;
}

/**
 * Execute `awg show all dump` inside the amneziawg container via Docker socket.
 * Returns per-peer stats parsed from the tab-separated output.
 */
export async function getWgPeerStats(): Promise<WgPeerStats[]> {
  const containerName = config.awgContainerName;
  try {
    const output = await dockerExec(containerName, ["awg", "show", "all", "dump"]);
    if (!output) return [];
    return parseWgDump(output);
  } catch (err) {
    console.error("[wg-stats] Failed to get peer stats:", (err as Error).message);
    return [];
  }
}

function parseWgDump(output: string): WgPeerStats[] {
  const lines = output.trim().split("\n");
  const peers: WgPeerStats[] = [];
  const now = Math.floor(Date.now() / 1000);

  for (const line of lines) {
    const cols = line.split("\t");
    // Peer lines have 8+ columns; interface lines have 4
    if (cols.length < 8) continue;

    const publicKey = cols[0];
    // cols[1] = preshared key, cols[2] = endpoint
    const latestHandshake = parseInt(cols[4], 10) || 0;
    const transferRx = parseInt(cols[5], 10) || 0;
    const transferTx = parseInt(cols[6], 10) || 0;

    // Online if handshake within last 3 minutes
    const isOnline = latestHandshake > 0 && (now - latestHandshake) < 180;

    peers.push({ publicKey, latestHandshake, transferRx, transferTx, isOnline });
  }

  return peers;
}
