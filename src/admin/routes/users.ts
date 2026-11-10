import { Hono } from "hono";
import { eq, like, or, desc, and, gte } from "drizzle-orm";
import { randomBytes } from "node:crypto";
import { db } from "../../db/index.js";
import { users, connectionSnapshots } from "../../db/schema.js";
import { marzban } from "../../marzban/instance.js";
import type { MarzbanUser } from "../../marzban/types.js";
import { provisionUser, revokeUser, syncAfterDbChange } from "../../vpn/provider.js";
import { naiveProxy } from "../../naiveproxy/instance.js";
import { singbox } from "../../singbox/instance.js";
import { sshTunnel } from "../../ssh-tunnel/instance.js";
import { mieru } from "../../mieru/instance.js";
import { hashTelegramId } from "../../utils/hash.js";
import { getNumber, getString } from "../../settings.js";
import { config } from "../../config.js";

const usersRouter = new Hono();

type ActivityTier = "active" | "idle" | "never_connected" | "revoked";

function deriveActivityTier(user: {
  isActive: boolean;
  lastKnownBandwidth: number;
  lastActiveAt: string | null;
  marzbanUsername: string | null;
}, marzbanData?: MarzbanUser): ActivityTier {
  if (!user.isActive) return "revoked";

  // Check Marzban online_at for real-time status
  if (marzbanData?.online_at) {
    const tenMinutesAgo = Date.now() - 10 * 60 * 1000;
    if (new Date(marzbanData.online_at).getTime() > tenMinutesAgo) return "active";
  }

  // Check Marzban used_traffic
  if (marzbanData?.used_traffic && marzbanData.used_traffic > 0) {
    if (marzbanData.online_at) {
      const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      return new Date(marzbanData.online_at).getTime() > sevenDaysAgo ? "active" : "idle";
    }
    return "idle";
  }

  // Fall back to last-known activity
  if (!user.lastKnownBandwidth && !user.marzbanUsername) return "never_connected";
  if (!user.lastKnownBandwidth && !marzbanData) return "never_connected";
  if (!user.lastActiveAt) return "idle";
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  return new Date(user.lastActiveAt).getTime() > sevenDaysAgo ? "active" : "idle";
}

function hasSingboxCredentials(user: typeof users.$inferSelect): boolean {
  return !!(user.shadowTlsUsername || user.hysteria2Password || user.tuicUuid || user.trojanPassword);
}

function buildSingboxUrl(user: typeof users.$inferSelect): string | null {
  if (!user.isActive || !user.webToken) return null;
  const hasSingbox = !!(user.marzbanSubUrl || user.shadowTlsUsername || user.hysteria2Password || user.tuicUuid || user.trojanPassword);
  if (!hasSingbox) return null;
  // Use CDN domain (behind Cloudflare) — same URL users get in the web app
  const base = config.marzbanSubUrlBase?.replace(/\/$/, "") || getString("web.appDomain")?.replace(/\/app\/?$/, "") || "";
  if (!base) return null;
  return `${base}/api/web/singbox?token=${user.webToken}`;
}

function buildHiddifySubUrl(user: typeof users.$inferSelect): string | null {
  if (!user.isActive || !user.webToken) return null;
  const hasHiddify = !!(user.marzbanSubUrl || user.shadowTlsUsername || user.naiveUsername || user.sshPublicKey || user.mieruUsername);
  if (!hasHiddify) return null;
  const base = config.marzbanSubUrlBase?.replace(/\/$/, "") || getString("web.appDomain")?.replace(/\/app\/?$/, "") || "";
  if (!base) return null;
  return `${base}/api/web/hiddify?token=${user.webToken}`;
}

// List all users with optional search
usersRouter.get("/", async (c) => {
  let search = c.req.query("search");
  if (search && search.length > 100) search = search.slice(0, 100);
  let query = db.select().from(users).orderBy(desc(users.createdAt)).$dynamic();

  if (search) {
    query = query.where(
      or(
        like(users.referralCode, `%${search}%`),
        like(users.telegramIdHash, `%${search}%`),
      ),
    );
  }

  const result = await query;

  // Fetch Marzban user data (bulk). Page through all users — a single
  // getUsers(0, 500) silently truncates once the deployment exceeds 500
  // Marzban users, which would zero-out bandwidth for everyone past the cap.
  let marzbanMap: Record<string, MarzbanUser> = {};
  if (marzban) {
    try {
      const pageSize = 500;
      for (let offset = 0; ; offset += pageSize) {
        const page = await marzban.getUsers(offset, pageSize);
        for (const mu of page.users) marzbanMap[mu.username] = mu;
        if (page.users.length < pageSize) break;
      }
    } catch {
      // Marzban may not be available
    }
  }

  const enriched = result.map((u) => {
    const mData = u.marzbanUsername ? marzbanMap[u.marzbanUsername] : undefined;
    const marzbanBytes = mData?.lifetime_used_traffic || 0;
    // Strip sensitive VPN credentials from bulk list response
    const { naivePassword, shadowTlsPassword, shadowTlsSsPassword,
      hysteria2Password, tuicPassword, trojanPassword,
      dnsttSocksPassword, ovpnCloakConfig, amneziaWgConfig,
      sshPrivateKey, mieruPassword, ...safe } = u;
    return {
      ...safe,
      // Only Marzban exposes real per-user traffic counters. sing-box protocols
      // (ShadowTLS/Hysteria2/TUIC/Trojan) share one inbound with no per-user
      // accounting, so the UI shows "—" instead of a misleading shared figure.
      transferBytes: marzbanBytes,
      bandwidthMeasured: !!u.marzbanUsername,
      marzbanOnlineAt: mData?.online_at || null,
      marzbanStatus: mData?.status || null,
      activityTier: deriveActivityTier(u, mData),
      protocols: {
        marzban: !!u.marzbanUsername,
        singbox: hasSingboxCredentials(u),
        amneziawg: !!u.amneziaWgPeerId,
        sshTunnel: !!u.sshPublicKey,
        mieru: !!u.mieruUsername,
      },
      singboxUrl: buildSingboxUrl(u),
      hiddifySubUrl: buildHiddifySubUrl(u),
    };
  });

  return c.json(enriched);
});

// Create a new user with VPN keys (admin-only)
usersRouter.post("/", async (c) => {
  const body = await c.req.json<{ label?: string; maxReferrals?: number }>().catch(() => ({} as { label?: string; maxReferrals?: number }));
  let label = (body.label || "Admin User").replace(/[<>&"']/g, "").trim();
  if (label.length > 100) label = label.slice(0, 100);
  let maxReferrals = typeof body.maxReferrals === "number" ? body.maxReferrals : config.maxReferrals;
  if (!Number.isInteger(maxReferrals) || maxReferrals < 0) maxReferrals = config.maxReferrals;
  if (maxReferrals > 10000) maxReferrals = 10000;

  const codeLen = getNumber("bot.referralCodeLength");
  const referralCode = randomBytes(codeLen).toString("hex").toLowerCase();
  const telegramIdHash = hashTelegramId(`admin-created-${Date.now()}-${referralCode}`);

  const name = `user:${referralCode}`;
  const provision = await provisionUser(name);
  const webToken = randomBytes(32).toString("hex");

  await db.insert(users).values({
    telegramIdHash,
    label,
    referralCode,
    webToken,
    maxReferrals,
    isActive: true,
    language: "en",
    marzbanUsername: provision.marzbanUsername,
    marzbanSubUrl: provision.marzbanSubUrl,
    amneziaWgPeerId: provision.amneziaWgPeerId,
    amneziaWgConfig: provision.amneziaWgConfig,
    ovpnCloakConfig: provision.ovpnCloakConfig,
    naiveUsername: provision.naiveUsername,
    naivePassword: provision.naivePassword,
    shadowTlsUsername: provision.shadowTlsUsername,
    shadowTlsPassword: provision.shadowTlsPassword,
    shadowTlsSsPassword: provision.shadowTlsSsPassword,
    hysteria2Password: provision.hysteria2Password,
    tuicUuid: provision.tuicUuid,
    tuicPassword: provision.tuicPassword,
    trojanPassword: provision.trojanPassword,
    dnsttSocksUsername: provision.dnsttSocksUsername,
    dnsttSocksPassword: provision.dnsttSocksPassword,
    sshPublicKey: provision.sshPublicKey,
    sshPrivateKey: provision.sshPrivateKey,
    mieruUsername: provision.mieruUsername,
    mieruPassword: provision.mieruPassword,
  });

  syncAfterDbChange(provision);

  const created = await db.query.users.findFirst({ where: eq(users.telegramIdHash, telegramIdHash) });
  return c.json(created);
});

// Bulk delete users
usersRouter.post("/bulk-delete", async (c) => {
  const body = await c.req.json<{ ids: number[] }>().catch(() => ({ ids: [] }));
  const ids = body.ids;
  if (!Array.isArray(ids) || ids.length === 0) {
    return c.json({ error: "ids must be a non-empty array" }, 400);
  }
  if (ids.length > 500) {
    return c.json({ error: "max 500 users per batch" }, 400);
  }
  if (!ids.every((id) => Number.isInteger(id) && id > 0)) {
    return c.json({ error: "all ids must be positive integers" }, 400);
  }

  // Fetch all users upfront
  const userRows = await Promise.all(
    ids.map((id) => db.query.users.findFirst({ where: eq(users.id, id) })),
  );

  let deleted = 0;
  const errors: { id: number; error: string }[] = [];
  let needNaiveSync = false;
  let needSingboxSync = false;
  let needSshSync = false;
  let needMieruSync = false;

  // Parallelize VPN provider revocations (HTTP calls), then do DB writes sequentially (SQLite)
  const validUsers = ids.map((id, idx) => ({ id, user: userRows[idx] })).filter((r) => {
    if (!r.user) {
      errors.push({ id: r.id, error: "not_found" });
      return false;
    }
    return true;
  });

  // Phase 1: Revoke VPN keys in parallel (all HTTP, no DB writes)
  await Promise.allSettled(
    validUsers.map(async ({ user }) => {
      await revokeUser({
        marzbanUsername: user!.marzbanUsername,
        amneziaWgPeerId: user!.amneziaWgPeerId,
        hadNaiveProxy: false,
        hadSingboxCredentials: false,
      });
    }),
  );

  // Phase 2: DB operations sequentially (SQLite can't handle concurrent writes)
  for (const { id, user } of validUsers) {
    try {
      if (user!.naiveUsername) needNaiveSync = true;
      if (hasSingboxCredentials(user!)) needSingboxSync = true;
      if (user!.sshPublicKey) needSshSync = true;
      if (user!.mieruUsername) needMieruSync = true;

      if (user!.referredBy) {
        const referrer = await db.query.users.findFirst({ where: eq(users.id, user!.referredBy) });
        if (referrer && referrer.referralCount > 0) {
          await db.update(users).set({ referralCount: referrer.referralCount - 1 }).where(eq(users.id, referrer.id));
        }
      }

      await db.update(users).set({ referredBy: null }).where(eq(users.referredBy, id));
      await db.delete(connectionSnapshots).where(eq(connectionSnapshots.userId, id));
      await db.delete(users).where(eq(users.id, id));
      deleted++;
    } catch (err) {
      errors.push({ id, error: String(err) });
    }
  }

  // Single config sync after all deletions
  if (needNaiveSync && naiveProxy) {
    naiveProxy.syncUsersAndReload().catch((err) => {
      console.error("[bulk-delete] NaiveProxy sync failed:", err);
    });
  }
  if (needSingboxSync && singbox) {
    singbox.syncConfig().catch((err) => {
      console.error("[bulk-delete] sing-box sync failed:", err);
    });
  }
  if (needSshSync && sshTunnel) {
    sshTunnel.syncAuthorizedKeys().catch((err) => {
      console.error("[bulk-delete] SSH tunnel sync failed:", err);
    });
  }
  if (needMieruSync && mieru) {
    mieru.syncConfig().catch((err) => {
      console.error("[bulk-delete] Mieru sync failed:", err);
    });
  }

  return c.json({ deleted, errors });
});

// Get single user with transfer data
usersRouter.get("/:id", async (c) => {
  const id = parseInt(c.req.param("id"), 10);
  const user = await db.query.users.findFirst({ where: eq(users.id, id) });
  if (!user) return c.json({ error: "not_found" }, 404);

  // Fetch Marzban user data
  let marzbanData: MarzbanUser | undefined;
  if (marzban && user.marzbanUsername) {
    try {
      marzbanData = await marzban.getUser(user.marzbanUsername);
    } catch {
      // Marzban may not be available
    }
  }

  const marzbanBytes = marzbanData?.lifetime_used_traffic || 0;

  // Get referral chain (who this user referred)
  const referrals = await db
    .select()
    .from(users)
    .where(eq(users.referredBy, user.id));

  // Connection history (last 48h)
  const since48h = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
  const connectionHistory = await db
    .select()
    .from(connectionSnapshots)
    .where(
      and(
        eq(connectionSnapshots.userId, user.id),
        gte(connectionSnapshots.snapshotAt, since48h),
      ),
    )
    .orderBy(connectionSnapshots.snapshotAt);

  return c.json({
    ...user,
    transferBytes: marzbanBytes,
    marzbanOnlineAt: marzbanData?.online_at || null,
    marzbanStatus: marzbanData?.status || null,
    marzbanUserAgent: marzbanData?.sub_last_user_agent || null,
    activityTier: deriveActivityTier(user, marzbanData),
    protocols: {
      marzban: !!user.marzbanUsername,
      singbox: hasSingboxCredentials(user),
      amneziawg: !!user.amneziaWgPeerId,
    },
    singboxUrl: buildSingboxUrl(user),
    hiddifySubUrl: buildHiddifySubUrl(user),
    connectionHistory,
    referrals,
  });
});

// Update user fields
usersRouter.patch("/:id", async (c) => {
  const id = parseInt(c.req.param("id"), 10);
  const body = await c.req.json<{ maxReferrals?: number; isActive?: boolean }>();

  const updates: Record<string, unknown> = {};
  if (typeof body.maxReferrals === "number") {
    if (!Number.isInteger(body.maxReferrals) || body.maxReferrals < 0 || body.maxReferrals > 10000) {
      return c.json({ error: "maxReferrals must be an integer between 0 and 10000" }, 400);
    }
    updates.maxReferrals = body.maxReferrals;
  }
  if (typeof body.isActive === "boolean") updates.isActive = body.isActive;

  if (Object.keys(updates).length === 0) {
    return c.json({ error: "no_fields" }, 400);
  }

  await db.update(users).set(updates).where(eq(users.id, id));
  const updated = await db.query.users.findFirst({ where: eq(users.id, id) });
  return c.json(updated);
});

// Delete user entirely
usersRouter.delete("/:id", async (c) => {
  const id = parseInt(c.req.param("id"), 10);
  const user = await db.query.users.findFirst({ where: eq(users.id, id) });
  if (!user) return c.json({ error: "not_found" }, 404);

  await revokeUser({
    marzbanUsername: user.marzbanUsername,
    amneziaWgPeerId: user.amneziaWgPeerId,
    hadNaiveProxy: !!user.naiveUsername,
    hadSingboxCredentials: hasSingboxCredentials(user),
    hadSshTunnel: !!user.sshPublicKey,
    hadMieru: !!user.mieruUsername,
  });

  // Decrement referrer's referral count
  if (user.referredBy) {
    const referrer = await db.query.users.findFirst({ where: eq(users.id, user.referredBy) });
    if (referrer && referrer.referralCount > 0) {
      await db.update(users).set({ referralCount: referrer.referralCount - 1 }).where(eq(users.id, referrer.id));
    }
  }

  // Clear referredBy for users this person referred (prevent FK issues)
  await db.update(users).set({ referredBy: null }).where(eq(users.referredBy, id));

  // Delete connection snapshots (FK constraint)
  await db.delete(connectionSnapshots).where(eq(connectionSnapshots.userId, id));

  await db.delete(users).where(eq(users.id, id));
  return c.json({ ok: true });
});

// Revoke a user's VPN key
usersRouter.post("/:id/revoke", async (c) => {
  const id = parseInt(c.req.param("id"), 10);
  const user = await db.query.users.findFirst({ where: eq(users.id, id) });
  if (!user) return c.json({ error: "not_found" }, 404);

  await revokeUser({
    marzbanUsername: user.marzbanUsername,
    amneziaWgPeerId: user.amneziaWgPeerId,
    hadNaiveProxy: !!user.naiveUsername,
    hadSingboxCredentials: hasSingboxCredentials(user),
    hadSshTunnel: !!user.sshPublicKey,
    hadMieru: !!user.mieruUsername,
  });

  await db
    .update(users)
    .set({
      isActive: false,
      marzbanUsername: null,
      marzbanSubUrl: null,
      amneziaWgPeerId: null,
      amneziaWgConfig: null,
      ovpnCloakConfig: null,
      naiveUsername: null,
      naivePassword: null,
      shadowTlsUsername: null,
      shadowTlsPassword: null,
      shadowTlsSsPassword: null,
      hysteria2Password: null,
      tuicUuid: null,
      tuicPassword: null,
      trojanPassword: null,
      sshPublicKey: null,
      sshPrivateKey: null,
      mieruUsername: null,
      mieruPassword: null,
    })
    .where(eq(users.id, id));

  const updated = await db.query.users.findFirst({ where: eq(users.id, id) });
  return c.json(updated);
});

// Restore a user's VPN key
usersRouter.post("/:id/restore", async (c) => {
  const id = parseInt(c.req.param("id"), 10);
  const user = await db.query.users.findFirst({ where: eq(users.id, id) });
  if (!user) return c.json({ error: "not_found" }, 404);

  const name = `user:${user.referralCode || user.id}`;
  const provision = await provisionUser(name);

  const updates: Record<string, unknown> = {
    isActive: true,
    marzbanUsername: provision.marzbanUsername,
    marzbanSubUrl: provision.marzbanSubUrl,
    amneziaWgPeerId: provision.amneziaWgPeerId,
    amneziaWgConfig: provision.amneziaWgConfig,
    ovpnCloakConfig: provision.ovpnCloakConfig,
    naiveUsername: provision.naiveUsername,
    naivePassword: provision.naivePassword,
    shadowTlsUsername: provision.shadowTlsUsername,
    shadowTlsPassword: provision.shadowTlsPassword,
    shadowTlsSsPassword: provision.shadowTlsSsPassword,
    hysteria2Password: provision.hysteria2Password,
    tuicUuid: provision.tuicUuid,
    tuicPassword: provision.tuicPassword,
    trojanPassword: provision.trojanPassword,
    dnsttSocksUsername: provision.dnsttSocksUsername,
    dnsttSocksPassword: provision.dnsttSocksPassword,
    sshPublicKey: provision.sshPublicKey,
    sshPrivateKey: provision.sshPrivateKey,
    mieruUsername: provision.mieruUsername,
    mieruPassword: provision.mieruPassword,
  };
  // Generate webToken if missing
  if (!user.webToken) {
    updates.webToken = randomBytes(32).toString("hex");
  }

  await db.update(users).set(updates).where(eq(users.id, id));

  syncAfterDbChange(provision);

  const updated = await db.query.users.findFirst({ where: eq(users.id, id) });
  return c.json(updated);
});

// Reset a user — revoke old keys and provision fresh ones
usersRouter.post("/:id/reset", async (c) => {
  const id = parseInt(c.req.param("id"), 10);
  const user = await db.query.users.findFirst({ where: eq(users.id, id) });
  if (!user) return c.json({ error: "not_found" }, 404);

  // Revoke existing keys
  await revokeUser({
    marzbanUsername: user.marzbanUsername,
    amneziaWgPeerId: user.amneziaWgPeerId,
    hadNaiveProxy: !!user.naiveUsername,
    hadSingboxCredentials: hasSingboxCredentials(user),
    hadSshTunnel: !!user.sshPublicKey,
    hadMieru: !!user.mieruUsername,
  });

  // Provision new keys with unique suffix to avoid Marzban username collision
  const suffix = Math.floor(Date.now() / 1000).toString(36);
  const name = `user:${user.referralCode || user.id}_${suffix}`;
  const provision = await provisionUser(name);

  const resetUpdates: Record<string, unknown> = {
    isActive: true,
    marzbanUsername: provision.marzbanUsername,
    marzbanSubUrl: provision.marzbanSubUrl,
    amneziaWgPeerId: provision.amneziaWgPeerId,
    amneziaWgConfig: provision.amneziaWgConfig,
    ovpnCloakConfig: provision.ovpnCloakConfig,
    naiveUsername: provision.naiveUsername,
    naivePassword: provision.naivePassword,
    shadowTlsUsername: provision.shadowTlsUsername,
    shadowTlsPassword: provision.shadowTlsPassword,
    shadowTlsSsPassword: provision.shadowTlsSsPassword,
    hysteria2Password: provision.hysteria2Password,
    tuicUuid: provision.tuicUuid,
    tuicPassword: provision.tuicPassword,
    trojanPassword: provision.trojanPassword,
    dnsttSocksUsername: provision.dnsttSocksUsername,
    dnsttSocksPassword: provision.dnsttSocksPassword,
    sshPublicKey: provision.sshPublicKey,
    sshPrivateKey: provision.sshPrivateKey,
    mieruUsername: provision.mieruUsername,
    mieruPassword: provision.mieruPassword,
  };
  if (!user.webToken) {
    resetUpdates.webToken = randomBytes(32).toString("hex");
  }

  await db.update(users).set(resetUpdates).where(eq(users.id, id));

  syncAfterDbChange(provision);

  const updated = await db.query.users.findFirst({ where: eq(users.id, id) });
  return c.json(updated);
});

export { usersRouter as usersRoutes };
