import { InlineKeyboard } from "grammy";
import type { BotContext } from "../context.js";
import { t } from "../../i18n/translations.js";

const APP_URLS = {
  singbox_iphone: "https://apps.apple.com/app/sing-box-vt/id6673731168",
  singbox_android: "https://play.google.com/store/apps/details?id=io.nekohasekai.sfa",
  hiddify_iphone: "https://apps.apple.com/app/hiddify-proxy-vpn/id6596777532",
  hiddify_android: "https://play.google.com/store/apps/details?id=app.hiddify.com",
  amnezia_iphone: "https://apps.apple.com/app/amneziavpn/id1600529900",
  amnezia_android: "https://play.google.com/store/apps/details?id=org.amnezia.vpn",
};

export async function helpCommand(ctx: BotContext) {
  const keyboard = new InlineKeyboard()
    .url("\u{1F34E} sing-box", APP_URLS.singbox_iphone)
    .url("\u{1F4F1} sing-box", APP_URLS.singbox_android)
    .row()
    .url("\u{1F34E} Hiddify", APP_URLS.hiddify_iphone)
    .url("\u{1F4F1} Hiddify", APP_URLS.hiddify_android)
    .row()
    .url("\u{1F34E} AmneziaVPN", APP_URLS.amnezia_iphone)
    .url("\u{1F4F1} AmneziaVPN", APP_URLS.amnezia_android)
    .row()
    .text(t(ctx.lang, "btn_show_my_key"), "action:show_key")
    .row()
    .text(t(ctx.lang, "btn_reset_keys"), "action:reset_keys")
    .row()
    .text(t(ctx.lang, "btn_change_language"), "action:change_lang");

  await ctx.reply(t(ctx.lang, "help"), {
    parse_mode: "HTML",
    reply_markup: keyboard,
  });
}
