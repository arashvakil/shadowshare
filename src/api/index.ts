import { readFileSync } from "node:fs";
import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { webRoutes } from "./routes/web.js";
import { awgRoutes } from "./routes/awg.js";
import { config } from "../config.js";
import { getBoolean, getString } from "../settings.js";
import { SETTING_DEFINITIONS } from "../settings.js";
import type { AppEnv } from "./types.js";

const api = new Hono<AppEnv>();

// Public flags endpoint — no auth required
api.get("/api/flags", (c) => {
  const flags: Record<string, unknown> = {};
  for (const def of SETTING_DEFINITIONS) {
    if (def.category === "feature") {
      flags[def.key] = getBoolean(def.key);
    }
  }
  flags["bot.shareMessageText"] = getString("bot.shareMessageText");
  flags["web.communityLink"] = getString("web.communityLink");
  flags["web.supportContact"] = getString("web.supportContact");
  c.header("Cache-Control", "no-cache");
  return c.json(flags);
});

// Service check middleware — return 503 if API is disabled
api.use("/api/*", async (c, next) => {
  // Allow /api/flags through even when API is off
  if (c.req.path === "/api/flags") {
    await next();
    return;
  }
  if (!getBoolean("service.api")) {
    return c.json({ error: "API is temporarily disabled" }, 503);
  }
  await next();
});

// Web app API routes
api.route("/api/web", webRoutes);

// AmneziaWG config page — public, no auth
api.route("/awg", awgRoutes);

// Security headers for web app
api.use("/app/*", async (c, next) => {
  await next();
  c.header("X-Content-Type-Options", "nosniff");
  c.header("X-Frame-Options", "DENY");
  c.header("Referrer-Policy", "strict-origin-when-cross-origin");
  c.header("Content-Security-Policy", "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'");
});

// Serve webapp static files under /app
api.use("/app/*", serveStatic({ root: "./dist/webapp", rewriteRequestPath: (path) => path.replace(/^\/app/, "") }));

// SPA fallback for /app routes (skip asset files — they should 404 if not found)
api.get("/app/*", (c) => {
  if (c.req.path.startsWith("/app/assets/")) {
    return c.text("Not found", 404);
  }
  try {
    const indexHtml = readFileSync("./dist/webapp/index.html", "utf-8");
    c.header("Cache-Control", "no-cache");
    return c.html(indexHtml);
  } catch {
    return c.text("Not found", 404);
  }
});
api.get("/app", (c) => {
  try {
    const indexHtml = readFileSync("./dist/webapp/index.html", "utf-8");
    c.header("Cache-Control", "no-cache");
    return c.html(indexHtml);
  } catch {
    return c.text("Not found", 404);
  }
});

export function startApiServer() {
  const port = config.apiPort;
  serve({ fetch: api.fetch, port }, () => {
    console.log(`API server running on port ${port}`);
  });
}
