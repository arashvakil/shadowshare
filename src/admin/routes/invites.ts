import { Hono } from "hono";
import { eq, isNull, desc } from "drizzle-orm";
import { randomBytes } from "node:crypto";
import { db } from "../../db/index.js";
import { users } from "../../db/schema.js";
import { hashTelegramId } from "../../utils/hash.js";
import { getNumber, getBoolean, getString } from "../../settings.js";
import { defaultMaxReferrals } from "../../db/defaults.js";

const invitesRouter = new Hono();

function generateReferralCode(): string {
  const len = getNumber("bot.referralCodeLength");
  return randomBytes(len).toString("hex").toLowerCase();
}

function makeInviteLink(code: string): string {
  const webAppDomain = getString("web.appDomain");
  if (webAppDomain) {
    return `${webAppDomain}?ref=${code}`;
  }
  return `/app?ref=${code}`;
}

// List all admin-generated invite links
invitesRouter.get("/invites", async (c) => {
  // Invite seeds are placeholder users with no VPN provisioning yet — they get
  // a Marzban user only once the referral code is redeemed.
  const seeds = await db
    .select()
    .from(users)
    .where(isNull(users.marzbanUsername))
    .orderBy(desc(users.createdAt));

  const result = seeds.map((u) => ({
    id: u.id,
    referralCode: u.referralCode,
    link: u.referralCode ? makeInviteLink(u.referralCode) : null,
    referralCount: u.referralCount,
    maxReferrals: u.maxReferrals,
    label: u.label,
    createdAt: u.createdAt,
  }));

  return c.json(result);
});

// Create a new invite link
invitesRouter.post("/invites", async (c) => {
  if (!getBoolean("feature.inviteLinks")) {
    return c.json({ error: "Invite link creation is disabled" }, 403);
  }
  const body = await c.req.json<{ label?: string; maxReferrals?: number }>().catch(() => ({} as { label?: string; maxReferrals?: number }));
  const code = generateReferralCode();
  let label = body.label || "Admin Invite";
  if (label.length > 100) label = label.slice(0, 100);
  let maxReferrals = typeof body.maxReferrals === "number" ? body.maxReferrals : defaultMaxReferrals();
  if (!Number.isInteger(maxReferrals) || maxReferrals < 0) maxReferrals = defaultMaxReferrals();
  if (maxReferrals > 10000) maxReferrals = 10000;

  await db.insert(users).values({
    telegramIdHash: hashTelegramId(`admin-seed-${Date.now()}`),
    label,
    referralCode: code,
    maxReferrals,
    isActive: true,
    language: "en",
  });

  return c.json({
    referralCode: code,
    link: makeInviteLink(code),
    maxReferrals,
    label,
  });
});

// Delete an invite link
invitesRouter.delete("/invites/:id", async (c) => {
  const id = parseInt(c.req.param("id"), 10);
  await db.delete(users).where(eq(users.id, id));
  return c.json({ ok: true });
});

export { invitesRouter as invitesRoutes };
