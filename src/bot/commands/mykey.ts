import { eq } from "drizzle-orm";
import { InlineKeyboard } from "grammy";
import type { BotContext } from "../context.js";
import { db } from "../../db/index.js";
import { users } from "../../db/schema.js";
import { config } from "../../config.js";
import { t } from "../../i18n/translations.js";
import { hashTelegramId } from "../../utils/hash.js";
import { getString, getBoolean } from "../../settings.js";

export async function mykeyCommand(ctx: BotContext) {
  const telegramId = ctx.from?.id?.toString();
  if (!telegramId) return;

  const user = await db.query.users.findFirst({
    where: eq(users.telegramIdHash, hashTelegramId(telegramId)),
  });

  if (!user) {
    await ctx.reply(t(ctx.lang, "mykey_no_key"));
    return;
  }

  // Prefer sing-box subscription URL (has TLS fragment, clean domain, backup CDN)
  const appDomain = getString("web.appDomain") || "";
  const baseUrl = appDomain ? appDomain.replace(/\/app\/?$/, "") : "";
  const keyUrl = (baseUrl && user?.webToken)
    ? baseUrl + "/api/web/singbox?token=" + user.webToken
    : user?.marzbanSubUrl;
  if (!keyUrl) {
    await ctx.reply(t(ctx.lang, "mykey_no_key"));
    return;
  }

  if (!user.isActive) {
    await ctx.reply(t(ctx.lang, "mykey_revoked"));
    return;
  }

  const keyboard = new InlineKeyboard();

  // Dashboard button (full overview)
  keyboard.text(t(ctx.lang, "btn_dashboard"), "action:dashboard").row();

  // Subscription QR
  keyboard.text(t(ctx.lang, "btn_show_sub_qr"), "action:show_sub_qr").row();

  // V2rayNG subscription
  if (user.marzbanSubUrl) {
    keyboard.text(t(ctx.lang, "btn_v2ray_sub"), "action:show_v2ray_sub").row();
  }

  if (user.amneziaWgConfig) {
    keyboard.text(t(ctx.lang, "btn_show_awg_config"), "action:show_awg_config").row();
  }

  if (user.ovpnCloakConfig) {
    keyboard.text(t(ctx.lang, "btn_show_ovpn_config"), "action:show_ovpn_config").row();
  }

  if (user.shadowTlsUsername) {
    keyboard.text(t(ctx.lang, "btn_show_shadowtls_config"), "action:show_shadowtls_config").row();
  }

  // DNS Tunnel
  if (user.dnsttSocksUsername && config.dnsttTunnelDomain && getBoolean("feature.dnstt")) {
    keyboard.text(t(ctx.lang, "btn_show_dnstt"), "setup:app_dnstt").row();
  }

  keyboard
    .text(t(ctx.lang, "btn_my_invite_link"), "action:invite")
    .row()
    .text(t(ctx.lang, "btn_help"), "action:help");

  const keyText = t(ctx.lang, "mykey_show_sub", { subUrl: keyUrl });

  await ctx.reply(keyText, { parse_mode: "HTML", reply_markup: keyboard });
}
