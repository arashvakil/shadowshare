/**
 * Cloudflare Worker — pass-through proxy for your CDN domain.
 *
 * Forwards every request to the origin on port 80 and preserves the CDN Host
 * header so Caddy routes it. A starting point for edge-level logic
 * (header manipulation, geo-based routing, etc.).
 *
 * Configure in wrangler.toml [vars]: ORIGIN_URL, CDN_HOST.
 */

interface Env {
  ORIGIN_URL: string; // e.g. http://origin.example.com (DNS-only hostname; Workers can't fetch raw IPs)
  CDN_HOST: string; // e.g. cdn.example.com
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const originUrl = new URL(url.pathname + url.search, env.ORIGIN_URL);

    const originRequest = new Request(originUrl.toString(), {
      method: request.method,
      headers: request.headers,
      body: request.body,
      redirect: "manual",
    });

    // Preserve the Host header so Caddy routes correctly
    originRequest.headers.set("Host", env.CDN_HOST);

    return fetch(originRequest);
  },
};
