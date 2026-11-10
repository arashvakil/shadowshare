import { eq } from "drizzle-orm";
import { InlineKeyboard } from "grammy";
import type { BotContext } from "../context.js";
import { t } from "../../i18n/translations.js";
import { pendingReferrals } from "../state.js";
import { db } from "../../db/index.js";
import { users } from "../../db/schema.js";
import { hashTelegramId } from "../../utils/hash.js";

export async function startCommand(ctx: BotContext) {
  const param = ctx.match?.toString().trim() || "";
  const telegramId = ctx.from?.id?.toString();
  if (!telegramId) return;

  const idHash = hashTelegramId(telegramId);

  // Check if user already has an active key (returning user)
  const existingUser = await db.query.users.findFirst({
    where: eq(users.telegramIdHash, idHash),
  });

  if ((existingUser?.marzbanUsername || existingUser?.amneziaWgPeerId || existingUser?.shadowTlsUsername || existingUser?.ovpnCloakConfig) && existingUser.isActive) {
    // Returning user — show "Welcome back" with dashboard buttons
    const keyboard = new InlineKeyboard()
      .text(t(ctx.lang, "btn_show_my_key"), "action:show_key")
      .row()
      .text(t(ctx.lang, "btn_my_invite_link"), "action:invite");

    await ctx.reply(t(ctx.lang, "welcome_returning"), {
      reply_markup: keyboard,
    });
    return;
  }

  // New user — store referral code for after language selection
  if (param.startsWith("ref_")) {
    pendingReferrals.set(telegramId, param.replace("ref_", ""));
  }

  // Show language picker (bot handles onboarding now, not Mini App)
  const keyboard = new InlineKeyboard()
    .text("English", "lang:en")
    .row()
    .text("Finglish \u{1F1EE}\u{1F1F7}", "lang:pi")
    .row()
    .text("\u{1F1EE}\u{1F1F7} \u0641\u0627\u0631\u0633\u06CC", "lang:fa");

  await ctx.reply(t(ctx.lang, "language_prompt"), {
    reply_markup: keyboard,
  });
}
