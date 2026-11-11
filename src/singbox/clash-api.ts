import http from "node:http";

export interface ClashConnection {
  id: string;
  metadata: {
    network: string;
    type: string;
    inbound: string;
    sourceIP: string;
    destinationIP: string;
    sourcePort: string;
    destinationPort: string;
    host: string;
  };
  upload: number;
  download: number;
  start: string;
  chains: string[];
  rule: string;
  rulePayload: string;
}

export interface ClashConnectionsResponse {
  downloadTotal: number;
  uploadTotal: number;
  connections: ClashConnection[] | null;
}

export class ClashApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl.replace(/\/$/, "");
  }

  private fetchConnections(): Promise<ClashConnectionsResponse | null> {
    return new Promise((resolve) => {
      const url = new URL(`${this.baseUrl}/connections`);
      const req = http.request(
        {
          hostname: url.hostname,
          port: url.port,
          path: url.pathname,
          method: "GET",
          timeout: 5000,
        },
        (res) => {
          let data = "";
          res.on("data", (chunk) => (data += chunk));
          res.on("end", () => {
            try {
              resolve(JSON.parse(data));
            } catch {
              console.error("[clash-api] Failed to parse response");
              resolve(null);
            }
          });
        },
      );
      req.on("error", (err) => {
        console.error("[clash-api] Request failed:", JSON.stringify(err.message));
        resolve(null);
      });
      req.on("timeout", () => {
        req.destroy();
        resolve(null);
      });
      req.end();
    });
  }

  async getActiveConnections(): Promise<ClashConnection[]> {
    const resp = await this.fetchConnections();
    return resp?.connections || [];
  }

  async getTotalBytes(): Promise<number> {
    const resp = await this.fetchConnections();
    if (!resp) return 0;
    return (resp.downloadTotal || 0) + (resp.uploadTotal || 0);
  }

  /** Get total bytes for connections on a specific inbound (e.g. "socks-dnstt-in") */
  async getInboundBytes(inboundTag: string): Promise<number> {
    const resp = await this.fetchConnections();
    if (!resp?.connections) return 0;
    let total = 0;
    for (const conn of resp.connections) {
      if (conn.metadata.inbound === inboundTag) {
        total += (conn.upload || 0) + (conn.download || 0);
      }
    }
    return total;
  }
}

// Singleton — only created if SINGBOX_CLASH_API_URL is set or defaults
const clashApiUrl = process.env.SINGBOX_CLASH_API_URL || "http://singbox:9090";
export const clashApi = new ClashApiClient(clashApiUrl);
