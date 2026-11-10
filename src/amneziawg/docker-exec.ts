import http from "node:http";

/**
 * Execute a command inside a Docker container via the Docker socket.
 * Returns stdout as string, or null if execution fails.
 */
export async function dockerExec(container: string, cmd: string[]): Promise<string | null> {
  try {
    const execId = await dockerExecCreate(container, cmd);
    if (!execId) return null;
    return dockerExecStart(execId);
  } catch (err) {
    console.error(`[docker-exec] Failed to exec in ${container}:`, (err as Error).message);
    return null;
  }
}

function dockerExecCreate(container: string, cmd: string[]): Promise<string | null> {
  return new Promise((resolve) => {
    const body = JSON.stringify({ AttachStdout: true, AttachStderr: true, Cmd: cmd });
    const req = http.request(
      {
        socketPath: "/var/run/docker.sock",
        path: `/containers/${container}/exec`,
        method: "POST",
        headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(body) },
        timeout: 5000,
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          try {
            const parsed = JSON.parse(data);
            resolve(parsed.Id || null);
          } catch {
            resolve(null);
          }
        });
      },
    );
    req.on("error", () => resolve(null));
    req.on("timeout", () => { req.destroy(); resolve(null); });
    req.write(body);
    req.end();
  });
}

function dockerExecStart(execId: string): Promise<string | null> {
  return new Promise((resolve) => {
    const body = JSON.stringify({ Detach: false, Tty: false });
    const req = http.request(
      {
        socketPath: "/var/run/docker.sock",
        path: `/exec/${execId}/start`,
        method: "POST",
        headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(body) },
        timeout: 10000,
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (chunk: Buffer) => chunks.push(chunk));
        res.on("end", () => {
          const raw = Buffer.concat(chunks);
          const text = stripDockerStreamHeaders(raw);
          resolve(text || null);
        });
      },
    );
    req.on("error", () => resolve(null));
    req.on("timeout", () => { req.destroy(); resolve(null); });
    req.write(body);
    req.end();
  });
}

/** Strip Docker multiplexed stream 8-byte headers from exec output. */
function stripDockerStreamHeaders(buf: Buffer): string {
  const parts: string[] = [];
  let offset = 0;
  while (offset + 8 <= buf.length) {
    const size = buf.readUInt32BE(offset + 4);
    if (offset + 8 + size > buf.length) break;
    parts.push(buf.subarray(offset + 8, offset + 8 + size).toString("utf-8"));
    offset += 8 + size;
  }
  return parts.length > 0 ? parts.join("") : buf.toString("utf-8");
}
