import { Hono } from "hono";
import { getSecurityStats } from "../auth.js";

const security = new Hono();

security.get("/security", (c) => {
  return c.json(getSecurityStats());
});

export { security as securityRoutes };
