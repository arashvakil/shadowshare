import { eq } from "drizzle-orm";
import { InlineKeyboard } from "grammy";
import type { BotContext } from "../context.js";
import { db } from "../../db/index.js";
import { users } from "../../db/schema.js";
import { t, type Language } from "../../i18n/translations.js";
import { pendingReferrals } from "../state.js";
import { redeemReferral } from "./getkey.js";
import { hashTelegramId } from "../../utils/hash.js";

export async function languageCommand(ctx: BotContext) {
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

export async function languageCallback(ctx: BotContext) {
  const telegramId = ctx.from?.id?.toString();
  if (!telegramId) return;

  const lang = ctx.callbackQuery?.data?.replace("lang:", "") as Language;
  if (lang !== "en" && lang !== "fa" && lang !== "pi") return;

  const idHash = hashTelegramId(telegramId);

  // Upsert user
  const existing = await db.query.users.findFirst({
    where: eq(users.telegramIdHash, idHash),
  });

  const telegramLangCode = ctx.from?.language_code || null;

  if (existing) {
    await db
      .update(users)
      .set({ language: lang, telegramLangCode })
      .where(eq(users.telegramIdHash, idHash));
  } else {
    await db.insert(users).values({
      telegramIdHash: idHash,
      language: lang,
      telegramLangCode,
    });
  }

  ctx.lang = lang;
  await ctx.answerCallbackQuery();
  await ctx.editMessageText(t(lang, "language_switched"));

  // Check for pending referral — auto-redeem
  const pendingCode = pendingReferrals.get(telegramId);
  if (pendingCode) {
    pendingReferrals.delete(telegramId);
    await redeemReferral(ctx, pendingCode);
    return;
  }

  // Check if user already has a key (returning user changing language)
  const user = await db.query.users.findFirst({
    where: eq(users.telegramIdHash, idHash),
  });

  if ((user?.marzbanUsername || user?.amneziaWgPeerId || user?.shadowTlsUsername || user?.ovpnCloakConfig) && user.isActive) {
    const keyboard = new InlineKeyboard()
      .text(t(lang, "btn_show_my_key"), "action:show_key")
      .row()
      .text(t(lang, "btn_my_invite_link"), "action:invite")
      .row()
      .text(t(lang, "btn_help"), "action:help");

    await ctx.reply(t(lang, "welcome_returning"), {
      reply_markup: keyboard,
    });
    return;
  }

  // New user without referral — tell them they need an invite link
  const keyboard = new InlineKeyboard()
    .text(t(lang, "btn_enter_code"), "action:enter_code")
    .row()
    .text(t(lang, "btn_what_is_this"), "action:what_is_this");

  await ctx.reply(t(lang, "need_invite"), {
    reply_markup: keyboard,
  });
}
