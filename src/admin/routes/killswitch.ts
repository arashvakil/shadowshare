import { Hono } from "hono";
import { existsSync, writeFileSync, unlinkSync } from "node:fs";
import { resolve } from "node:path";
import { db } from "../../db/index.js";
import { users, usageSnapshots } from "../../db/schema.js";
import { config } from "../../config.js";
import { revokeUser } from "../../vpn/provider.js";

const killswitch = new Hono();

function getKillFlag(): string {
  return resolve(config.databasePath, "..", ".killed");
}

killswitch.get("/status", (c) => {
  return c.json({ isKilled: existsSync(getKillFlag()) });
});

killswitch.post("/kill", async (c) => {
  const allUsers = await db.select().from(users);

  for (const user of allUsers) {
    try {
      await revokeUser({
        marzbanUsername: user.marzbanUsername,
        amneziaWgPeerId: user.amneziaWgPeerId,
        hadNaiveProxy: !!user.naiveUsername,
        hadSingboxCredentials: !!(user.shadowTlsUsername || user.hysteria2Password || user.tuicUuid || user.trojanPassword),
        hadSshTunnel: !!user.sshPublicKey,
        hadMieru: !!user.mieruUsername,
      });
    } catch {
      // Best effort only during emergency kill
    }
  }

  // Wipe DB tables
  await db.delete(usageSnapshots);
  await db.delete(users);

  // Write kill flag
  writeFileSync(getKillFlag(), new Date().toISOString());

  // Exit after a short delay so the response can be sent
  setTimeout(() => process.exit(0), 500);

  return c.json({ ok: true, message: "System killed. Process will restart in admin-only mode." });
});

killswitch.post("/revive", (c) => {
  const flag = getKillFlag();
  if (existsSync(flag)) {
    unlinkSync(flag);
  }

  // Exit after a short delay so the response can be sent
  setTimeout(() => process.exit(0), 500);

  return c.json({ ok: true, message: "Kill flag removed. Process will restart with bot enabled." });
});

export { killswitch as killswitchRoutes };
