import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { Bot, InlineKeyboard, InputFile } from "grammy";
import { eq } from "drizzle-orm";
import { config } from "../config.js";
import { db } from "../db/index.js";
import { users } from "../db/schema.js";
import { hashTelegramId } from "../utils/hash.js";
import { buildAwgVpnUri } from "../amneziawg/vpn-uri.js";
import type { BotContext } from "./context.js";

// Middleware
import { rateLimit } from "./middleware/rate-limit.js";
import { loadLanguage } from "./middleware/language.js";
import { adminOnly } from "./middleware/auth.js";

// User commands
import { startCommand } from "./commands/start.js";
import { helpCommand } from "./commands/help.js";
import { mykeyCommand } from "./commands/mykey.js";
import { languageCommand, languageCallback } from "./commands/language.js";
import { inviteCommand } from "./commands/invite.js";
import { statusCommand } from "./commands/status.js";
import { redeemReferral } from "./commands/getkey.js";
import { awaitingReferralCode } from "./state.js";
import {
  setupAppSingboxCallback,
  setupAppHiddifyCallback,
  setupAppAmneziaCallback,
  setupStep2SingboxCallback,
  setupStep2HiddifyCallback,
  setupStep2AmneziaCallback,
  setupDeviceIphoneCallback,
  setupDeviceAndroidCallback,
  setupStep2Callback,
  setupCopyKeyCallback,
  setupDoneCallback,
  setupShowSubCallback,
  setupGetConfigFileCallback,
  showSubLink,
  showV2RaySubCallback,
  setupAppDnsttCallback,
  setupDnsttAndroidCallback,
  setupDnsttIosCallback,
  showNpvTunnelCallback,
  setupBackupTunnelsCallback,
  setupMasterDnsCallback,
  setupMasterDnsAndroidCallback,
  setupMasterDnsDesktopCallback,
  showDashboard,
  showSingboxCardCallback,
  showHiddifyCardCallback,
  showMtprotoCallback,
} from "./commands/setup.js";
import { t } from "../i18n/translations.js";
import { generateQrPng } from "./utils/qr.js";
import { provisionUser, revokeUser } from "../vpn/provider.js";
import { singbox } from "../singbox/instance.js";

// Admin commands
import { adminLinkCommand } from "./admin/codes.js";
import { listUsersCommand, revokeCommand } from "./admin/users.js";
import { statsCommand } from "./admin/stats.js";

import { getBoolean, getNumber, getString } from "../settings.js";

// Check kill switch and service.bot flag
const KILL_FLAG = resolve(config.databasePath, "..", ".killed");
if (existsSync(KILL_FLAG)) {
  console.log("Kill switch active. Bot NOT starting. Admin panel is available.");
} else if (!getBoolean("service.bot")) {
  console.log("service.bot is disabled. Bot NOT starting. Admin panel is available.");
} else {
  // Initialize bot
  const bot = new Bot<BotContext>(config.botToken);

  // Global middleware
  bot.use(rateLimit);
  bot.use(loadLanguage);

  // Commands
  bot.command("start", startCommand);
  bot.command("help", helpCommand);
  bot.command("mykey", mykeyCommand);
  bot.command("language", languageCommand);
  bot.command("invite", inviteCommand);
  bot.command("status", statusCommand);

  // Language picker callback
  bot.callbackQuery(/^lang:/, languageCallback);

  // Setup step callbacks — new app picker flow
  bot.callbackQuery("setup:app_singbox", setupAppSingboxCallback);
  bot.callbackQuery("setup:app_hiddify", setupAppHiddifyCallback);
  bot.callbackQuery("setup:app_amneziavpn", setupAppAmneziaCallback);
  bot.callbackQuery("setup:step2_sb", setupStep2SingboxCallback);
  bot.callbackQuery("setup:step2_hd", setupStep2HiddifyCallback);
  bot.callbackQuery("setup:step2_az", setupStep2AmneziaCallback);

  // DNS Tunnel setup callbacks
  bot.callbackQuery("setup:app_dnstt", setupAppDnsttCallback);
  bot.callbackQuery("setup:dnstt_android", setupDnsttAndroidCallback);
  bot.callbackQuery("setup:dnstt_ios", setupDnsttIosCallback);

  // Backup Tunnels (merged DNS + NPV)
  bot.callbackQuery("setup:app_backup_tunnels", setupBackupTunnelsCallback);

  // NPV Tunnel callbacks
  bot.callbackQuery("setup:app_npv", showNpvTunnelCallback);
  bot.callbackQuery("action:show_npv", showNpvTunnelCallback);

  // MasterDNS Tunnel callbacks
  bot.callbackQuery("setup:app_masterdns", setupMasterDnsCallback);
  bot.callbackQuery("setup:masterdns_android", setupMasterDnsAndroidCallback);
  bot.callbackQuery("setup:masterdns_desktop", setupMasterDnsDesktopCallback);

  // MTProto Proxy callback
  bot.callbackQuery("action:show_mtproto", showMtprotoCallback);

  // Backward-compatible callbacks (old device picker → defaults to sing-box)
  bot.callbackQuery("setup:device_iphone", setupDeviceIphoneCallback);
  bot.callbackQuery("setup:device_android", setupDeviceAndroidCallback);
  bot.callbackQuery("setup:step2", setupStep2Callback);
  bot.callbackQuery("setup:copy_key", setupCopyKeyCallback);
  bot.callbackQuery("setup:get_config_file", setupGetConfigFileCallback);
  bot.callbackQuery("setup:done", setupDoneCallback);
  bot.callbackQuery("setup:show_sub", setupShowSubCallback);

  // Action callbacks from inline buttons
  bot.callbackQuery("action:what_is_this", async (ctx) => {
    await ctx.answerCallbackQuery();
    await ctx.reply(t(ctx.lang, "what_is_this"));
  });

  bot.callbackQuery("action:dashboard", async (ctx) => {
    await ctx.answerCallbackQuery();
    await showDashboard(ctx);
  });

  bot.callbackQuery("action:show_singbox_card", showSingboxCardCallback);
  bot.callbackQuery("action:show_hiddify_card", showHiddifyCardCallback);
  bot.callbackQuery("action:show_v2ray_sub", showV2RaySubCallback);
  bot.callbackQuery("action:show_key", async (ctx) => {
    await ctx.answerCallbackQuery();
    await mykeyCommand(ctx);
  });

  bot.callbackQuery("action:invite", async (ctx) => {
    await ctx.answerCallbackQuery();
    await inviteCommand(ctx);
  });

  bot.callbackQuery("action:help", async (ctx) => {
    await ctx.answerCallbackQuery();
    await helpCommand(ctx);
  });

  bot.callbackQuery("action:change_lang", async (ctx) => {
    await ctx.answerCallbackQuery();
    await languageCommand(ctx);
  });

  bot.callbackQuery("action:reset_keys", async (ctx) => {
    await ctx.answerCallbackQuery();
    const telegramId = ctx.from?.id?.toString();
    if (!telegramId) return;

    const user = await db.query.users.findFirst({
      where: eq(users.telegramIdHash, hashTelegramId(telegramId)),
    });
    if (!user || (!user.marzbanUsername && !user.amneziaWgPeerId && !user.shadowTlsUsername && !user.ovpnCloakConfig)) {
      await ctx.reply(t(ctx.lang, "reset_no_key"));
      return;
    }

    const keyboard = new InlineKeyboard()
      .text("\u{2705} " + t(ctx.lang, "btn_done"), "action:reset_confirm")
      .row()
      .text(t(ctx.lang, "btn_help"), "action:help");

    await ctx.reply(t(ctx.lang, "reset_confirm"), { reply_markup: keyboard });
  });

  bot.callbackQuery("action:reset_confirm", async (ctx) => {
    await ctx.answerCallbackQuery();
    const telegramId = ctx.from?.id?.toString();
    if (!telegramId) return;

    const user = await db.query.users.findFirst({
      where: eq(users.telegramIdHash, hashTelegramId(telegramId)),
    });
    if (!user) return;

    // Revoke old keys
    await revokeUser({
      marzbanUsername: user.marzbanUsername,
      amneziaWgPeerId: user.amneziaWgPeerId,
      hadNaiveProxy: false,
      hadSingboxCredentials: !!(user.shadowTlsUsername || user.hysteria2Password || user.tuicUuid || user.trojanPassword),
    });

    // Provision new keys with unique suffix to avoid Marzban username collision
    const suffix = Math.floor(Date.now() / 1000).toString(36);
    const name = `user:${user.referralCode || user.id}_${suffix}`;
    const provision = await provisionUser(name);

    await db
      .update(users)
      .set({
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
      })
      .where(eq(users.id, user.id));

    // Show success message then the new sub link with QR
    await ctx.reply(t(ctx.lang, "reset_success"), { parse_mode: "HTML" });

    const keyUrl = provision.marzbanSubUrl;
    if (keyUrl) {
      await showSubLink(ctx, keyUrl);
    }
  });

  bot.callbackQuery("action:enter_code", async (ctx) => {
    await ctx.answerCallbackQuery();
    if (!getBoolean("feature.manualCodeEntry")) {
      await ctx.reply(t(ctx.lang, "feature_disabled"));
      return;
    }
    const telegramId = ctx.from?.id?.toString();
    if (!telegramId) return;
    awaitingReferralCode.add(telegramId);
    await ctx.reply(t(ctx.lang, "enter_code_prompt"), { parse_mode: "HTML" });
  });

  bot.callbackQuery("action:show_qr", async (ctx) => {
    await ctx.answerCallbackQuery();
    const telegramId = ctx.from?.id?.toString();
    if (!telegramId) return;

    const user = await db.query.users.findFirst({
      where: eq(users.telegramIdHash, hashTelegramId(telegramId)),
    });

    // Prefer sing-box subscription URL
    const appDomain = getString("web.appDomain") || "";
    const baseUrl = appDomain ? appDomain.replace(/\/app\/?$/, "") : "";
    const qrUrl = (baseUrl && user?.webToken)
      ? baseUrl + "/api/web/singbox?token=" + user.webToken
      : user?.marzbanSubUrl;
    if (!qrUrl) return;

    const keyboard = new InlineKeyboard();
    const encodedUrl = encodeURIComponent(qrUrl);
    keyboard.url(t(ctx.lang, "btn_open_in_singbox"), `sing-box://import-remote-profile?url=${encodedUrl}`).row();
    keyboard
      .text(t(ctx.lang, "btn_copy_key"), "setup:copy_key")
      .row()
      .text(t(ctx.lang, "btn_my_invite_link"), "action:invite");

    try {
      const qrPng = generateQrPng(qrUrl);
      await ctx.replyWithPhoto(new InputFile(qrPng, "vpn-key-qr.png"), {
        caption: t(ctx.lang, "qr_caption"),
        reply_markup: keyboard,
      });
    } catch {
      await ctx.reply(t(ctx.lang, "qr_caption"), {
        reply_markup: keyboard,
      });
    }
  });

  bot.callbackQuery("action:show_awg_config", async (ctx) => {
    await ctx.answerCallbackQuery();
    const telegramId = ctx.from?.id?.toString();
    if (!telegramId) return;

    const user = await db.query.users.findFirst({
      where: eq(users.telegramIdHash, hashTelegramId(telegramId)),
    });

    if (!user?.amneziaWgConfig) {
      await ctx.reply(t(ctx.lang, "mykey_no_key"));
      return;
    }

    const vpnUri = buildAwgVpnUri(user.amneziaWgConfig);

    const keyboard = new InlineKeyboard()
      .url(t(ctx.lang, "btn_download_amneziavpn"), "https://amnezia.org/downloads")
      .row()
      .text(t(ctx.lang, "btn_my_invite_link"), "action:invite");

    await ctx.reply(
      t(ctx.lang, "awg_config_message") + "\n\n<code>" + vpnUri + "</code>",
      { parse_mode: "HTML", reply_markup: keyboard },
    );
  });

  bot.callbackQuery("action:show_ovpn_config", async (ctx) => {
    await ctx.answerCallbackQuery();
    const telegramId = ctx.from?.id?.toString();
    if (!telegramId) return;

    const user = await db.query.users.findFirst({
      where: eq(users.telegramIdHash, hashTelegramId(telegramId)),
    });

    if (!user?.ovpnCloakConfig) {
      await ctx.reply(t(ctx.lang, "mykey_no_key"));
      return;
    }

    // Generate vpn:// URI from the stored config JSON
    const vpnUri = "vpn://" + Buffer.from(user.ovpnCloakConfig).toString("base64url");

    const keyboard = new InlineKeyboard()
      .url(t(ctx.lang, "btn_download_amneziavpn"), "https://amnezia.org/downloads")
      .row()
      .text(t(ctx.lang, "btn_my_invite_link"), "action:invite");

    await ctx.reply(
      t(ctx.lang, "ovpn_config_message") + "\n\n<code>" + vpnUri + "</code>",
      { parse_mode: "HTML", reply_markup: keyboard },
    );

    try {
      const qrPng = generateQrPng(vpnUri);
      await ctx.replyWithPhoto(new InputFile(qrPng, "ovpn-cloak-qr.png"), {
        caption: t(ctx.lang, "qr_or_scan"),
      });
    } catch {
      // QR generation may fail for long configs — vpn:// URIs can be very large
    }
  });


  bot.callbackQuery("action:show_shadowtls_config", async (ctx) => {
    await ctx.answerCallbackQuery();
    const telegramId = ctx.from?.id?.toString();
    if (!telegramId) return;

    const user = await db.query.users.findFirst({
      where: eq(users.telegramIdHash, hashTelegramId(telegramId)),
    });

    if (!user?.shadowTlsUsername || !user?.shadowTlsPassword || !user?.shadowTlsSsPassword || !singbox) {
      await ctx.reply(t(ctx.lang, "mykey_no_key"));
      return;
    }

    const singBoxConfig = JSON.stringify(
      singbox.buildOutbounds({
        shadowTlsPassword: user.shadowTlsPassword,
        shadowTlsSsPassword: user.shadowTlsSsPassword,
      }),
      null,
      2,
    );
    const ssUri = singbox.buildSsUri(user.shadowTlsSsPassword);

    const keyboard = new InlineKeyboard()
      .text(t(ctx.lang, "btn_my_invite_link"), "action:invite");

    await ctx.reply(
      t(ctx.lang, "shadowtls_config_message") + "\n\n<pre>" + singBoxConfig + "</pre>\n\n<code>" + ssUri + "</code>",
      { parse_mode: "HTML", reply_markup: keyboard },
    );
  });

  bot.callbackQuery("action:show_sub_qr", async (ctx) => {
    await ctx.answerCallbackQuery();
    const telegramId = ctx.from?.id?.toString();
    if (!telegramId) return;

    const user = await db.query.users.findFirst({
      where: eq(users.telegramIdHash, hashTelegramId(telegramId)),
    });

    // Prefer sing-box subscription URL
    const appDomain = getString("web.appDomain") || "";
    const baseUrl = appDomain ? appDomain.replace(/\/app\/?$/, "") : "";
    const subUrl = (baseUrl && user?.webToken)
      ? baseUrl + "/api/web/singbox?token=" + user.webToken
      : user?.marzbanSubUrl;
    if (!subUrl) return;

    const keyboard = new InlineKeyboard();
    const encodedUrl = encodeURIComponent(subUrl);
    keyboard.url(t(ctx.lang, "btn_open_in_singbox"), `sing-box://import-remote-profile?url=${encodedUrl}`).row();
    keyboard.text(t(ctx.lang, "btn_my_invite_link"), "action:invite");

    try {
      const qrPng = generateQrPng(subUrl);
      await ctx.replyWithPhoto(new InputFile(qrPng, "vpn-sub-qr.png"), {
        caption: t(ctx.lang, "qr_caption_sub"),
        reply_markup: keyboard,
      });
    } catch {
      await ctx.reply(t(ctx.lang, "qr_caption_sub"), { reply_markup: keyboard });
    }
  });

  // Admin commands
  bot.command("admin_link", adminOnly, adminLinkCommand);
  bot.command("admin_list_users", adminOnly, listUsersCommand);
  bot.command("admin_revoke", adminOnly, revokeCommand);
  bot.command("admin_stats", adminOnly, statsCommand);

  // Handle plain text messages — check for referral code entry or show nudge
  bot.on("message:text", async (ctx) => {
    const text = ctx.message.text.trim();
    if (text.startsWith("/")) return;

    const telegramId = ctx.from?.id?.toString();
    if (!telegramId) return;

    // User is entering a referral code manually
    if (awaitingReferralCode.has(telegramId)) {
      awaitingReferralCode.delete(telegramId);

      // Extract code — accept raw code or ref_CODE or full link
      let code = text;
      const refMatch = text.match(/ref_([a-f0-9]+)/i);
      if (refMatch) {
        code = refMatch[1];
      }
      code = code.toLowerCase();

      // Validate format: hex chars matching configured code length
      const codeLen = getNumber("bot.referralCodeLength") * 2;
      if (new RegExp(`^[a-f0-9]{${codeLen}}$`).test(code)) {
        await redeemReferral(ctx, code);
      } else {
        await ctx.reply(t(ctx.lang, "enter_code_invalid"), {
          parse_mode: "HTML",
        });
      }
      return;
    }

    const keyboard = new InlineKeyboard()
      .text(t(ctx.lang, "btn_enter_code"), "action:enter_code")
      .row()
      .text(t(ctx.lang, "btn_help"), "action:help")
      .row()
      .text(t(ctx.lang, "btn_change_language"), "action:change_lang");

    await ctx.reply(t(ctx.lang, "need_invite"), {
      reply_markup: keyboard,
    });
  });

  // Error handler
  bot.catch((err) => {
    console.error("Bot error:", err);
  });

  // Start bot
  console.log("Starting ShadowShare bot...");
  bot.start({
    onStart: () => {
      console.log("Bot is running");
    },
  });
}
