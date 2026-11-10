import { eq } from "drizzle-orm";
import { randomBytes } from "node:crypto";
import type { BotContext } from "../context.js";
import { db } from "../../db/index.js";
import { users } from "../../db/schema.js";
import { t } from "../../i18n/translations.js";
import { config } from "../../config.js";
import { hashTelegramId } from "../../utils/hash.js";

function generateReferralCode(): string {
  return randomBytes(4).toString("hex").toLowerCase();
}

function makeReferralLink(code: string): string {
  return `https://t.me/${config.botUsername}?start=ref_${code}`;
}

export async function adminLinkCommand(ctx: BotContext) {
  const telegramId = ctx.from?.id?.toString();
  if (!telegramId) return;

  const idHash = hashTelegramId(telegramId);

  let user = await db.query.users.findFirst({
    where: eq(users.telegramIdHash, idHash),
  });

  // Auto-create admin user record if needed
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
}
