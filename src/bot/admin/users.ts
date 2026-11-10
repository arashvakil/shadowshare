import { eq, desc } from "drizzle-orm";
import type { BotContext } from "../context.js";
import { db } from "../../db/index.js";
import { users } from "../../db/schema.js";
import { t } from "../../i18n/translations.js";
import { revokeUser } from "../../vpn/provider.js";
import { hashTelegramId } from "../../utils/hash.js";

export async function listUsersCommand(ctx: BotContext) {
  const allUsers = await db
    .select()
    .from(users)
    .orderBy(desc(users.createdAt));

  if (allUsers.length === 0) {
    await ctx.reply(t(ctx.lang, "admin_no_users"));
    return;
  }

  const lines = allUsers.map((u) => {
    const identifier = u.referralCode || u.telegramIdHash.slice(0, 8);
    const status = u.isActive ? "active" : "revoked";
    const marzban = u.marzbanUsername ? `mz:${u.marzbanUsername}` : "no key";
    const refs = `${u.referralCount}/${u.maxReferrals} refs`;
    return `${identifier} — ${marzban} [${status}] ${refs}`;
  });

  const chunks: string[] = [];
  let current = "";
  for (const line of lines) {
    if ((current + "\n" + line).length > 3900) {
      chunks.push(current);
      current = line;
    } else {
      current = current ? current + "\n" + line : line;
    }
  }
  if (current) chunks.push(current);

  for (const chunk of chunks) {
    await ctx.reply(t(ctx.lang, "admin_users_list", { list: chunk }));
  }
}

export async function revokeCommand(ctx: BotContext) {
  const targetTelegramId = ctx.match?.toString().trim();
  if (!targetTelegramId) {
    await ctx.reply(t(ctx.lang, "admin_revoke_usage"));
    return;
  }

  const targetHash = hashTelegramId(targetTelegramId);

  const user = await db.query.users.findFirst({
    where: eq(users.telegramIdHash, targetHash),
  });

  if (!user) {
    await ctx.reply(t(ctx.lang, "admin_revoke_not_found"));
    return;
  }

  try {
    await revokeUser({
      marzbanUsername: user.marzbanUsername,
      amneziaWgPeerId: user.amneziaWgPeerId,
      hadNaiveProxy: !!user.naiveUsername,
      hadSingboxCredentials: !!(user.shadowTlsUsername || user.hysteria2Password || user.tuicUuid || user.trojanPassword),
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
      })
      .where(eq(users.telegramIdHash, targetHash));

    await ctx.reply(
      t(ctx.lang, "admin_revoke_success", { telegramId: targetTelegramId }),
    );
  } catch (err) {
    console.error("Failed to revoke key:", err);
    await ctx.reply(t(ctx.lang, "admin_revoke_error"));
  }
}
