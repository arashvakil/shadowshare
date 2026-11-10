import { createMiddleware } from "hono/factory";
import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { users } from "../db/schema.js";
import type { User } from "../db/schema.js";

export type WebAppEnv = {
  Variables: {
    webUser: User;
  };
};

/**
 * Hono middleware that authenticates web users via Bearer token.
 * Looks up the user by webToken column.
 */
export const webAuth = createMiddleware<WebAppEnv>(async (c, next) => {
  const authHeader = c.req.header("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return c.json({ error: "Missing or invalid Authorization header" }, 401);
  }

  const token = authHeader.slice(7);
  if (!token || token.length !== 64) {
    return c.json({ error: "Invalid token" }, 401);
  }

  const user = await db.query.users.findFirst({
    where: eq(users.webToken, token),
  });

  if (!user) {
    return c.json({ error: "Invalid token" }, 401);
  }

  c.set("webUser", user);
  await next();
});
