import { eq } from "drizzle-orm";
import { randomBytes } from "node:crypto";
import type { BotContext } from "../context.js";
import { db } from "../../db/index.js";
import { users } from "../../db/schema.js";
import { t } from "../../i18n/translations.js";
import { config } from "../../config.js";
import { hashTelegramId } from "../../utils/hash.js";
import { getString } from "../../settings.js";

function generateReferralCode(): string {
  return randomBytes(4).toString("hex").toLowerCase();
}

function makeReferralLink(code: string): string {
  // Prefer web app link if appDomain is set, otherwise fall back to bot link
  const appDomain = getString("web.appDomain");
  if (appDomain) {
    return `${appDomain}?ref=${code}`;
  }
  return `https://t.me/${config.botUsername}?start=ref_${code}`;
}

export async function inviteCommand(ctx: BotContext) {
  const telegramId = ctx.from?.id?.toString();
  if (!telegramId) return;

  const idHash = hashTelegramId(telegramId);

  let user = await db.query.users.findFirst({
    where: eq(users.telegramIdHash, idHash),
  });

  const isAdmin = config.adminTelegramIds.includes(telegramId);

  // Admin auto-creates their record + referral code if needed
  if (isAdmin) {
    if (!user) {
      const code = generateReferralCode();
      await db.insert(users).values({
        telegramIdHash: idHash,
        referralCode: code,
        language: ctx.lang,
      });
      user = await db.query.users.findFirst({
        where: eq(users.telegramIdHash, idHash),
      });
    } else if (!user.referralCode) {
      const code = generateReferralCode();
      await db
        .update(users)
        .set({ referralCode: code })
        .where(eq(users.telegramIdHash, idHash));
      user = await db.query.users.findFirst({
        where: eq(users.telegramIdHash, idHash),
      });
    }

    const link = makeReferralLink(user!.referralCode!);
    await ctx.reply(t(ctx.lang, "admin_my_link", { link }), {
      parse_mode: "Markdown",
    });
    return;
  }

  // Regular user — must have a key and referral code
  if (!user?.referralCode) {
    await ctx.reply(t(ctx.lang, "mykey_no_key"));
    return;
  }

  const link = makeReferralLink(user.referralCode);
  const remaining = user.maxReferrals - user.referralCount;

  if (remaining <= 0) {
    await ctx.reply(
      t(ctx.lang, "referral_used_up", { max: user.maxReferrals.toString() }),
    );
    return;
  }

  await ctx.reply(
    t(ctx.lang, "your_referral_link", {
      remaining: remaining.toString(),
      link,
    }),
    { parse_mode: "Markdown" },
  );

  // Send pre-formatted share message (easy copy-paste)
  const shareText = getString("bot.shareMessageText") || "Join me on this VPN!";
  const shareMessage = `${shareText}\n${link}`;

  await ctx.reply(
    "\u{1F4E4} <b>Share message (tap to copy):</b>\n\n<code>" + shareMessage + "</code>",
    { parse_mode: "HTML" },
  );
}
