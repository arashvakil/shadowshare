import { Hono } from "hono";
import { getAllSettings, updateSettings } from "../../settings.js";

const settingsRouter = new Hono();

// GET /settings — return all settings with current values, types, categories
settingsRouter.get("/settings", (c) => {
  return c.json(getAllSettings());
});

// PATCH /settings — bulk update settings
settingsRouter.patch("/settings", async (c) => {
  const body = await c.req.json<Record<string, string>>().catch(() => ({} as Record<string, string>));

  if (!body || typeof body !== "object" || Object.keys(body).length === 0) {
    return c.json({ error: "No settings provided" }, 400);
  }

  const updated = await updateSettings(body as Record<string, string>);
  return c.json({ updated });
});

export { settingsRouter as settingsRoutes };
