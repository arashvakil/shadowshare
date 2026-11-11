import http from "node:http";

export interface ContainerNetworkStats {
  rxBytes: number;
  txBytes: number;
}

/**
 * Get network stats for a Docker container via the Docker socket API.
 * Returns total rx/tx bytes across all network interfaces.
 */
export function getContainerNetworkStats(containerName: string): Promise<ContainerNetworkStats | null> {
  return new Promise((resolve) => {
    const req = http.request(
      {
        socketPath: "/var/run/docker.sock",
        path: `/containers/${containerName}/stats?stream=false`,
        method: "GET",
        timeout: 10000,
      },
      (res) => {
        let data = "";
        res.on("data", (chunk: string) => (data += chunk));
        res.on("end", () => {
          try {
            const stats = JSON.parse(data);
            const networks = stats.networks;
            if (!networks) {
              resolve(null);
              return;
            }
            let rxBytes = 0;
            let txBytes = 0;
            for (const iface of Object.values(networks) as Array<{ rx_bytes?: number; tx_bytes?: number }>) {
              rxBytes += iface.rx_bytes || 0;
              txBytes += iface.tx_bytes || 0;
            }
            resolve({ rxBytes, txBytes });
          } catch {
            resolve(null);
          }
        });
      },
    );
    req.on("error", () => resolve(null));
    req.on("timeout", () => { req.destroy(); resolve(null); });
    req.end();
  });
}

/**
 * Count active TCP connections on a specific port inside a container.
 * Uses /proc/net/tcp which is universally available on Linux.
 * State 01 = ESTABLISHED.
 */
export async function countContainerTcpConnections(
  containerName: string,
  port: number,
): Promise<number> {
  const { dockerExec } = await import("../amneziawg/docker-exec.js");
  const portHex = port.toString(16).toUpperCase().padStart(4, "0");
  const output = await dockerExec(containerName, [
    "sh", "-c",
    `awk '$2 ~ /:${portHex}$/ && $4 == "01" {n++} END {print n+0}' /proc/net/tcp`,
  ]);
  if (!output) return 0;
  return parseInt(output.trim(), 10) || 0;
}
