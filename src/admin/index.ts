import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import type { Context, Next } from "hono";
import { config } from "../config.js";
import { authMiddleware, csrfMiddleware } from "./auth.js";
import { sessionRoutes } from "./routes/session.js";
import { dashboardRoutes } from "./routes/dashboard.js";
import { usersRoutes } from "./routes/users.js";
import { killswitchRoutes } from "./routes/killswitch.js";
import { invitesRoutes } from "./routes/invites.js";
import { settingsRoutes } from "./routes/settings.js";
import { monitoringRoutes } from "./routes/monitoring.js";
import { billingRoutes } from "./routes/billing.js";
import { securityRoutes } from "./routes/security.js";

const app = new Hono();

// Security headers
async function securityHeaders(c: Context, next: Next) {
  await next();
  c.header("X-Content-Type-Options", "nosniff");
  c.header("X-Frame-Options", "DENY");
  c.header("Strict-Transport-Security", "max-age=31536000");
  c.header("Referrer-Policy", "strict-origin-when-cross-origin");
}
app.use("*", securityHeaders);

// Session routes (login/logout don't need auth, /session does via its own middleware)
app.route("/", sessionRoutes);

// Protected API routes — auth + CSRF
app.use("/api/*", authMiddleware);
app.use("/api/*", csrfMiddleware);
app.route("/api", dashboardRoutes);
app.route("/api/users", usersRoutes);
app.route("/api", killswitchRoutes);
app.route("/api", invitesRoutes);
app.route("/api", settingsRoutes);
app.route("/api/monitoring", monitoringRoutes);
app.route("/api", billingRoutes);
app.route("/api", securityRoutes);

// Static files — serve public/admin/ at root
app.use("/*", serveStatic({ root: "./public/admin" }));

export function startAdminServer() {
  const port = config.adminPort;
  serve({ fetch: app.fetch, port }, () => {
    console.log(`Admin panel running on port ${port}`);
  });
}
