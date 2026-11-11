import { Hono } from "hono";
import {
  verifyPassword,
  checkRateLimit,
  logFailedLogin,
  logSuccessfulLogin,
  createSessionCookie,
  clearSessionCookie,
  getCsrfTokenForSession,
  authMiddleware,
} from "../auth.js";

const session = new Hono();

session.post("/login", async (c) => {
  const ip = c.req.header("cf-connecting-ip") || c.req.header("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (!checkRateLimit(ip)) {
    return c.json({ error: "too_many_attempts" }, 429);
  }

  const body = await c.req.json<{ password?: string }>().catch(() => ({} as { password?: string }));
  if (!body.password || !verifyPassword(body.password)) {
    logFailedLogin(ip);
    return c.json({ error: "invalid_password" }, 401);
  }

  logSuccessfulLogin(ip);
  const { cookie, csrfToken } = createSessionCookie();
  c.header("Set-Cookie", cookie);
  return c.json({ ok: true, csrfToken });
});

session.post("/logout", (c) => {
  c.header("Set-Cookie", clearSessionCookie());
  return c.json({ ok: true });
});

session.get("/session", authMiddleware, (c) => {
  const csrfToken = getCsrfTokenForSession(c.req.header("cookie"));
  return c.json({ ok: true, csrfToken });
});

export { session as sessionRoutes };
