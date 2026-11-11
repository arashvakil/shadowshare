/**
 * Cloudflare Worker — WebSocket relay for VLESS transport
 *
 * Deployed on workers.dev (no custom domain) so it resolves to
 * Cloudflare Worker edge IPs — different ranges than regular
 * proxied A-record domains. Useful where those ranges are blocked.
 *
 * Client → CF edge (workers.dev) → this Worker → origin:80 → Caddy → Xray
 *
 * IMPORTANT: Workers cannot fetch raw IPs (Error 1003), and a Host that is a
 * CF-proxied domain loops back through Cloudflare. ORIGIN_HOST must be a
 * DNS-only (grey cloud) hostname that resolves straight to your server.
 *
 * Configure in wrangler.toml [vars]: ORIGIN_HOST, ALLOWED_PATHS (comma-separated,
 * must match CDN_WS_PATH / CDN_HU_PATH in the app's .env).
 */

interface Env {
  ORIGIN_HOST: string;
  ALLOWED_PATHS: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // Only allow VPN transport paths
    const allowed = (env.ALLOWED_PATHS || "").split(",").map((p) => p.trim()).filter(Boolean);
    if (!allowed.includes(url.pathname)) {
      return new Response("Not Found", { status: 404 });
    }

    // Rewrite to origin hostname (DNS-only, resolves directly to the server)
    url.hostname = env.ORIGIN_HOST;
    url.port = "80";
    url.protocol = "http:";

    // new Request(url, request) preserves WebSocket upgrade context
    const originRequest = new Request(url.toString(), request);
    originRequest.headers.set("Host", env.ORIGIN_HOST);

    return fetch(originRequest);
  },
};
