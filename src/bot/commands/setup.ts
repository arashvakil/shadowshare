import { resolve } from "node:path";
import { eq } from "drizzle-orm";
import { InlineKeyboard, InputFile } from "grammy";
import type { BotContext } from "../context.js";
import { db } from "../../db/index.js";
import { users } from "../../db/schema.js";
import { config } from "../../config.js";
import { t, type Language } from "../../i18n/translations.js";
import { generateQrPng } from "../utils/qr.js";
import { startConnectionCheck } from "../utils/connection-check.js";
import { hashTelegramId } from "../../utils/hash.js";
import { buildAwgVpnUri } from "../../amneziawg/vpn-uri.js";
import { getString, getBoolean } from "../../settings.js";
import { marzban } from "../../marzban/instance.js";

const SETUP_IMAGES = {
  plusButton: resolve("public/setup-images/streisand-plus-button.png"),
  clipboard: resolve("public/setup-images/streisand-clipboard.jpg"),
};

const APP_URLS = {
  singbox_iphone: "https://apps.apple.com/app/sing-box-vt/id6673731168",
  singbox_android: "https://play.google.com/store/apps/details?id=io.nekohasekai.sfa",
  hiddify_iphone: "https://apps.apple.com/app/hiddify-proxy-vpn/id6596777532",
  hiddify_android: "https://play.google.com/store/apps/details?id=app.hiddify.com",
  amnezia_iphone: "https://apps.apple.com/app/amneziavpn/id1600529900",
  amnezia_android: "https://play.google.com/store/apps/details?id=org.amnezia.vpn",
};

// === Step 1: App Picker ===

export async function sendSetupStep1(ctx: BotContext) {
  const hasDnstt = getBoolean("feature.dnstt") && !!config.dnsttTunnelDomain;
  const hasNpv = getBoolean("feature.npvTunnel") && config.npvServers.length > 0 && !!config.dnsttSshPassword;
  const hasMasterDns = getBoolean("feature.masterDnsTunnel") && !!config.masterDnsEncryptionKey && !!config.dnsttTunnelDomain;
  const emergency = getBoolean("feature.networkEmergency");
  const masterDnsPrimary = hasMasterDns && emergency;

  const keyboard = new InlineKeyboard();

  // MasterDNS first (primary, recommended) only during a network emergency
  if (masterDnsPrimary) {
    keyboard.text(t(ctx.lang, "btn_masterdns_recommended"), "setup:app_masterdns").row();
  }

  // Regular apps
  keyboard
    .text(t(ctx.lang, "btn_app_singbox"), "setup:app_singbox").row()
    .text(t(ctx.lang, "btn_app_hiddify"), "setup:app_hiddify").row()
    .text(t(ctx.lang, "btn_app_amneziavpn"), "setup:app_amneziavpn");

  // MasterDNS de-emphasized (when not in emergency, it's just another backup tunnel)
  if (hasMasterDns && !masterDnsPrimary) {
    keyboard.row().text(t(ctx.lang, "btn_show_masterdns"), "setup:app_masterdns");
  }

  // Backup tunnels (DNSTT + NPV)
  if (hasDnstt || hasNpv) {
    keyboard.row().text(t(ctx.lang, "btn_show_backup_tunnels"), "setup:app_backup_tunnels");
  }

  const intro = masterDnsPrimary
    ? t(ctx.lang, "bot_network_status") + "\n\n" + t(ctx.lang, "bot_other_options_note")
    : t(ctx.lang, "setup_pick_app");

  await ctx.reply(intro, {
    parse_mode: "HTML",
    reply_markup: keyboard,
  });
}

// === Step 2: Download App ===

export async function setupAppSingboxCallback(ctx: BotContext) {
  await ctx.answerCallbackQuery();
  const keyboard = new InlineKeyboard()
    .url("\u{1F34E} sing-box (App Store)", APP_URLS.singbox_iphone)
    .row()
    .url("\u{1F4F1} sing-box (Play Store)", APP_URLS.singbox_android)
    .row()
    .text(t(ctx.lang, "btn_installed"), "setup:step2_sb");

  await ctx.reply(t(ctx.lang, "setup_download_singbox"), {
    parse_mode: "HTML",
    reply_markup: keyboard,
  });
}

export async function setupAppHiddifyCallback(ctx: BotContext) {
  await ctx.answerCallbackQuery();
  const keyboard = new InlineKeyboard()
    .url("\u{1F34E} Hiddify (App Store)", APP_URLS.hiddify_iphone)
    .row()
    .url("\u{1F4F1} Hiddify (Play Store)", APP_URLS.hiddify_android)
    .row()
    .text(t(ctx.lang, "btn_installed"), "setup:step2_hd");

  await ctx.reply(t(ctx.lang, "setup_download_hiddify"), {
    parse_mode: "HTML",
    reply_markup: keyboard,
  });
}

export async function setupAppAmneziaCallback(ctx: BotContext) {
  await ctx.answerCallbackQuery();
  const keyboard = new InlineKeyboard()
    .url("\u{1F34E} AmneziaVPN (App Store)", APP_URLS.amnezia_iphone)
    .row()
    .url("\u{1F4F1} AmneziaVPN (Play Store)", APP_URLS.amnezia_android)
    .row()
    .text(t(ctx.lang, "btn_installed"), "setup:step2_az");

  await ctx.reply(t(ctx.lang, "setup_download_amneziavpn"), {
    parse_mode: "HTML",
    reply_markup: keyboard,
  });
}

// === Step 3: Subscription / Config ===

/** Get the sing-box subscription URL for a user */
function getSingboxUrl(user: { webToken: string | null; marzbanSubUrl: string | null }): string | null {
  const appDomain = getString("web.appDomain") || "";
  const baseUrl = appDomain ? appDomain.replace(/\/app\/?$/, "") : "";
  if (baseUrl && user.webToken) {
    return baseUrl + "/api/web/singbox?token=" + user.webToken;
  }
  return user.marzbanSubUrl || null;
}

/** Get the Hiddify-specific subscription URL for a user */
function getHiddifyUrl(user: { webToken: string | null }): string | null {
  const appDomain = getString("web.appDomain") || "";
  const baseUrl = appDomain ? appDomain.replace(/\/app\/?$/, "") : "";
  if (baseUrl && user.webToken) {
    return baseUrl + "/api/web/hiddify?token=" + user.webToken;
  }
  return null;
}

/** sing-box / Hiddify — show subscription link */
async function showSubSetup(ctx: BotContext, appType: "singbox" | "hiddify" = "singbox") {
  const telegramId = ctx.from?.id?.toString();
  if (!telegramId) return;

  const user = await db.query.users.findFirst({
    where: eq(users.telegramIdHash, hashTelegramId(telegramId)),
  });

  if (!user || !user.marzbanSubUrl) {
    await ctx.answerCallbackQuery();
    return;
  }

  await ctx.answerCallbackQuery();

  // Use Hiddify-specific subscription URL when available (includes NaiveProxy, SSH, Mieru)
  const subUrl = appType === "hiddify" ? (getHiddifyUrl(user) || getSingboxUrl(user)) : getSingboxUrl(user);
  if (!subUrl) return;
  await showSubLink(ctx, subUrl, appType);
}

export async function setupStep2SingboxCallback(ctx: BotContext) {
  await showSubSetup(ctx, "singbox");
}

export async function setupStep2HiddifyCallback(ctx: BotContext) {
  await showSubSetup(ctx, "hiddify");
}

/** AmneziaVPN — show AWG + OVPN configs */
export async function setupStep2AmneziaCallback(ctx: BotContext) {
  const telegramId = ctx.from?.id?.toString();
  if (!telegramId) return;

  const user = await db.query.users.findFirst({
    where: eq(users.telegramIdHash, hashTelegramId(telegramId)),
  });

  if (!user) {
    await ctx.answerCallbackQuery();
    return;
  }

  await ctx.answerCallbackQuery();

  await ctx.reply(t(ctx.lang, "setup_step2_amnezia"), { parse_mode: "HTML" });

  // Show AmneziaWG config as vpn:// URI + downloadable file
  if (user.amneziaWgConfig) {
    const vpnUri = buildAwgVpnUri(user.amneziaWgConfig);

    await ctx.reply(
      "\u{1F6E1}\uFE0F <b>AmneziaWG 2.0</b>\n\n<code>" + vpnUri + "</code>",
      { parse_mode: "HTML" },
    );

    // Send config as downloadable file
    const awgBuf = Buffer.from(user.amneziaWgConfig, "utf-8");
    await ctx.replyWithDocument(new InputFile(awgBuf, "amneziawg.conf"), {
      caption: t(ctx.lang, "amnezia_file_caption"),
    });

    try {
      const qrPng = generateQrPng(vpnUri);
      await ctx.replyWithPhoto(new InputFile(qrPng, "awg-config-qr.png"), {
        caption: t(ctx.lang, "qr_or_scan"),
      });
    } catch {
      // QR generation may fail for long configs
    }
  }

  // Show OpenVPN+Cloak config + downloadable file
  if (user.ovpnCloakConfig) {
    const ovpnVpnUri = "vpn://" + Buffer.from(user.ovpnCloakConfig).toString("base64url");
    await ctx.reply(
      "\u{1F510} <b>OpenVPN + Cloak</b>\n\n" + t(ctx.lang, "ovpn_config_message") + "\n\n<code>" + ovpnVpnUri + "</code>",
      { parse_mode: "HTML" },
    );

    // Send config as downloadable file
    const ovpnBuf = Buffer.from(user.ovpnCloakConfig, "utf-8");
    await ctx.replyWithDocument(new InputFile(ovpnBuf, "openvpn-cloak.vpn"), {
      caption: t(ctx.lang, "amnezia_file_caption"),
    });
  }

  // Done button
  const keyboard = new InlineKeyboard()
    .text("\u{2705} " + t(ctx.lang, "btn_done"), "setup:done");

  await ctx.reply(t(ctx.lang, "setup_all_set"), {
    reply_markup: keyboard,
  });
}

// === Backward-compatible callbacks (old device picker flow → default to sing-box) ===

export async function setupDeviceIphoneCallback(ctx: BotContext) {
  await ctx.answerCallbackQuery();
  const keyboard = new InlineKeyboard()
    .url(t(ctx.lang, "btn_download_iphone"), APP_URLS.singbox_iphone)
    .row()
    .text(t(ctx.lang, "btn_installed"), "setup:step2");

  await ctx.reply(t(ctx.lang, "setup_step1_iphone"), {
    parse_mode: "HTML",
    reply_markup: keyboard,
  });
}

export async function setupDeviceAndroidCallback(ctx: BotContext) {
  await ctx.answerCallbackQuery();
  const keyboard = new InlineKeyboard()
    .url(t(ctx.lang, "btn_download_android"), APP_URLS.singbox_android)
    .row()
    .text(t(ctx.lang, "btn_installed"), "setup:step2");

  await ctx.reply(t(ctx.lang, "setup_step1_android"), {
    parse_mode: "HTML",
    reply_markup: keyboard,
  });
}

export async function setupStep2Callback(ctx: BotContext) {
  await showSubSetup(ctx);
}

// === Show subscription link with QR ===

export async function showSubLink(ctx: BotContext, subUrl: string, appType: "singbox" | "hiddify" = "singbox") {
  const keyboard = new InlineKeyboard();

  // Deep link buttons — one-tap import
  const encodedUrl = encodeURIComponent(subUrl);
  if (appType === "singbox") {
    keyboard.url(t(ctx.lang, "btn_open_in_singbox"), `sing-box://import-remote-profile?url=${encodedUrl}`).row();
  } else {
    keyboard.url(t(ctx.lang, "btn_open_in_hiddify"), `hiddify://import/${encodedUrl}`).row();
  }

  keyboard.text(t(ctx.lang, "btn_get_config_file"), "setup:get_config_file");
  keyboard.row();
  keyboard.text("\u{2705} " + t(ctx.lang, "btn_done"), "setup:done");

  await ctx.reply(t(ctx.lang, "setup_step2_sub"), { parse_mode: "HTML" });

  // Send the subscription URL as its own message for easy copy-paste
  await ctx.reply(`<code>${subUrl}</code>`, { parse_mode: "HTML" });

  // Send screenshots only for Hiddify (images are Hiddify-specific)
  if (appType === "hiddify") {
    try {
      await ctx.replyWithPhoto(new InputFile(SETUP_IMAGES.plusButton), {
        caption: t(ctx.lang, "setup_img_plus"),
      });
      await ctx.replyWithPhoto(new InputFile(SETUP_IMAGES.clipboard), {
        caption: t(ctx.lang, "setup_img_clipboard"),
      });
    } catch {
      // Images are optional — continue without them
    }
  }

  try {
    const qrPng = generateQrPng(subUrl);
    await ctx.replyWithPhoto(new InputFile(qrPng, "vpn-sub-qr.png"), {
      caption: t(ctx.lang, "qr_or_scan"),
      reply_markup: keyboard,
    });
  } catch {
    await ctx.reply(t(ctx.lang, "qr_or_scan"), { reply_markup: keyboard });
  }

  // Send Slipstream guide for Hiddify users
  if (appType === "hiddify") {
    if (config.dnsttTunnelDomain) {
      await ctx.reply(
        t(ctx.lang, "slipstream_bot_guide", { domain: `${config.dnsttSlipstreamDomain}.${config.dnsttTunnelDomain}` }),
        { parse_mode: "HTML" },
      );
    }
  }
}

export async function setupShowSubCallback(ctx: BotContext) {
  const telegramId = ctx.from?.id?.toString();
  if (!telegramId) return;
  await ctx.answerCallbackQuery();

  const user = await db.query.users.findFirst({
    where: eq(users.telegramIdHash, hashTelegramId(telegramId)),
  });
  const keyUrl = user?.marzbanSubUrl;
  if (!keyUrl) return;

  await showSubLink(ctx, keyUrl);
}

export async function setupCopyKeyCallback(ctx: BotContext) {
  const telegramId = ctx.from?.id?.toString();
  if (!telegramId) return;

  const user = await db.query.users.findFirst({
    where: eq(users.telegramIdHash, hashTelegramId(telegramId)),
  });

  const keyUrl = user?.marzbanSubUrl;
  if (!keyUrl) {
    await ctx.answerCallbackQuery({ text: "No key found" });
    return;
  }

  try {
    await ctx.answerCallbackQuery({
      text: keyUrl,
      // @ts-expect-error - grammY types may not include copy_text yet
      copy_text: { text: keyUrl },
    });
  } catch {
    await ctx.answerCallbackQuery({
      text: keyUrl,
      show_alert: true,
    });
  }
}

/** Fetch sing-box config from local API and send as a .json document */
export async function setupGetConfigFileCallback(ctx: BotContext) {
  const telegramId = ctx.from?.id?.toString();
  if (!telegramId) return;
  await ctx.answerCallbackQuery();

  const user = await db.query.users.findFirst({
    where: eq(users.telegramIdHash, hashTelegramId(telegramId)),
  });

  if (!user?.webToken) {
    await ctx.reply(t(ctx.lang, "config_file_error"));
    return;
  }

  try {
    const apiUrl = `http://127.0.0.1:${config.apiPort}/api/web/singbox?token=${user.webToken}`;
    const resp = await fetch(apiUrl);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const json = await resp.json();
    const buf = Buffer.from(JSON.stringify(json, null, 2), "utf-8");

    await ctx.replyWithDocument(new InputFile(buf, "sing-box-config.json"), {
      caption: t(ctx.lang, "amnezia_file_caption"),
      parse_mode: "HTML",
    });
  } catch (e) {
    console.error("Config file generation failed:", e);
    await ctx.reply(t(ctx.lang, "config_file_error"));
  }
}

export async function setupDoneCallback(ctx: BotContext) {
  await ctx.answerCallbackQuery();
  const telegramId = ctx.from?.id?.toString();

  const keyboard = new InlineKeyboard()
    .text(t(ctx.lang, "btn_dashboard"), "action:dashboard")
    .row()
    .text(t(ctx.lang, "btn_my_invite_link"), "action:invite")
    .row()
    .text(t(ctx.lang, "btn_show_my_key"), "action:show_key")
    .row()
    .text(t(ctx.lang, "btn_help"), "action:help")
    .row()
    .text(t(ctx.lang, "btn_change_language"), "action:change_lang");

  await ctx.reply(t(ctx.lang, "setup_all_set"), {
    reply_markup: keyboard,
  });

  // Prompt user to join the community channel (if one is configured)
  const communityLink = getString("web.communityLink");
  if (communityLink) {
    const betaKeyboard = new InlineKeyboard().url(t(ctx.lang, "btn_join_beta"), communityLink);
    await ctx.reply(t(ctx.lang, "join_beta"), {
      reply_markup: betaKeyboard,
    });
  }

  // Start background polling — send congrats when user connects
  if (telegramId) {
    const user = await db.query.users.findFirst({
      where: eq(users.telegramIdHash, hashTelegramId(telegramId)),
    });
  if (user?.marzbanUsername || user?.amneziaWgPeerId || user?.shadowTlsUsername || user?.ovpnCloakConfig) {
      startConnectionCheck(
        ctx.api,
        telegramId,
        user.marzbanUsername,
        ctx.lang as Language,
      );
    }
  }
}

// === V2rayNG subscription ===

export async function showV2RaySubCallback(ctx: BotContext) {
  await ctx.answerCallbackQuery();
  const telegramId = ctx.from?.id?.toString();
  if (!telegramId) return;

  const user = await db.query.users.findFirst({
    where: eq(users.telegramIdHash, hashTelegramId(telegramId)),
  });

  if (!user?.marzbanSubUrl || !user.isActive) {
    await ctx.reply(t(ctx.lang, "mykey_no_key"));
    return;
  }

  // Convert absolute Marzban URL to relative path, then build full URL from appDomain
  const appDomain = getString("web.appDomain") || "";
  const baseUrl = appDomain ? appDomain.replace(/\/app\/?$/, "") : "";
  const relativePath = user.marzbanSubUrl.replace(/^https?:\/\/[^/]+/, "");
  const v2rayFullUrl = baseUrl ? baseUrl + relativePath : user.marzbanSubUrl;

  const keyboard = new InlineKeyboard()
    .url("\u{1F4F1} V2rayNG (Play Store)", "https://play.google.com/store/apps/details?id=com.v2ray.ang")
    .row()
    .text(t(ctx.lang, "btn_my_invite_link"), "action:invite");

  await ctx.reply(t(ctx.lang, "v2ray_sub_message"), { parse_mode: "HTML" });
  await ctx.reply(`<code>${v2rayFullUrl}</code>`, {
    parse_mode: "HTML",
    reply_markup: keyboard,
  });
}

// === DNS Tunnel setup ===

export async function setupBackupTunnelsCallback(ctx: BotContext) {
  await ctx.answerCallbackQuery();

  const keyboard = new InlineKeyboard();

  // NPV Tunnel (faster, show first)
  if (getBoolean("feature.npvTunnel") && config.npvServers.length > 0 && config.dnsttSshPassword) {
    keyboard.text("🔗 " + t(ctx.lang, "btn_show_npv"), "action:show_npv").row();
  }

  // DNS Tunnel (MasterDNS is promoted to the primary dashboard, not listed here)
  if (getBoolean("feature.dnstt") && config.dnsttTunnelDomain) {
    keyboard.text("📡 " + t(ctx.lang, "btn_show_dnstt"), "setup:app_dnstt").row();
  }

  keyboard.text("📋 " + t(ctx.lang, "btn_dashboard"), "action:dashboard");

  await ctx.reply(t(ctx.lang, "backup_tunnels_bot_title"), {
    parse_mode: "HTML",
    reply_markup: keyboard,
  });
}

export async function setupAppDnsttCallback(ctx: BotContext) {
  await ctx.answerCallbackQuery();
  const telegramId = ctx.from?.id?.toString();
  if (!telegramId) return;

  const user = await db.query.users.findFirst({
    where: eq(users.telegramIdHash, hashTelegramId(telegramId)),
  });

  if (!user?.dnsttSocksUsername || !config.dnsttTunnelDomain) {
    await ctx.reply(t(ctx.lang, "mykey_no_key"));
    return;
  }

  const keyboard = new InlineKeyboard()
    .text("\u{1F4F1} Android (SlipNet)", "setup:dnstt_android")
    .row()
    .text("\u{1F34E} iOS (HTTP Injector)", "setup:dnstt_ios")
    .row()
    .text("\u{2705} " + t(ctx.lang, "btn_done"), "setup:done");

  await ctx.reply(t(ctx.lang, "dnstt_bot_title"), {
    parse_mode: "HTML",
    reply_markup: keyboard,
  });
}

export async function setupDnsttAndroidCallback(ctx: BotContext) {
  await ctx.answerCallbackQuery();
  const telegramId = ctx.from?.id?.toString();
  if (!telegramId) return;

  const user = await db.query.users.findFirst({
    where: eq(users.telegramIdHash, hashTelegramId(telegramId)),
  });

  if (!user?.dnsttSocksUsername || !config.dnsttTunnelDomain) {
    await ctx.reply(t(ctx.lang, "mykey_no_key"));
    return;
  }

  // Build SlipNet deep link using best available DNS resolver
  const dnsttDomain = `${config.dnsttDnsttDomain}.${config.dnsttTunnelDomain}`;
  const { getTopResolvers } = await import("../../jobs/scan-dns-resolvers.js");
  const topResolvers = await getTopResolvers(3);
  const primaryIp = topResolvers[0]?.ip || config.dnsttDnsRelayIp || "8.8.8.8";
  const dnsResolver = `${primaryIp}:53:0`;
  const fields = [
    "17", "dnstt", "ShadowShare", dnsttDomain,
    dnsResolver, "0", "5000", "bbr", "1080", "127.0.0.1", "0",
    config.dnsttPubkey, user.dnsttSocksUsername, user.dnsttSocksPassword || "",
    "0", "", "", "22", "0", "127.0.0.1", "0", "",
    "udp", "password", "", "", "", "0", "443", "", "",
    "0", "", "0", "0", "", "0", "",
  ];
  const slipnetUri = "slipnet://" + Buffer.from(fields.join("|")).toString("base64");

  await ctx.reply(t(ctx.lang, "dnstt_bot_android_title"), { parse_mode: "HTML" });
  await ctx.reply(t(ctx.lang, "dnstt_bot_android_desc"), { parse_mode: "HTML" });

  // Send URI as its own message so Telegram makes it a tappable link
  await ctx.reply(slipnetUri);

  const keyboard = new InlineKeyboard()
    .text("\u{2705} " + t(ctx.lang, "btn_done"), "setup:done");

  const backupIps = topResolvers.slice(1).map((r) => r.ip);
  const backupLine = backupIps.length > 0
    ? `\n\n${t(ctx.lang, "dnstt_backup_resolvers", { resolvers: backupIps.join(", ") })}`
    : "";

  await ctx.reply("Tap the link above to open SlipNet with your config." + backupLine, {
    reply_markup: keyboard,
  });
}

export async function setupDnsttIosCallback(ctx: BotContext) {
  await ctx.answerCallbackQuery();
  const telegramId = ctx.from?.id?.toString();
  if (!telegramId) return;

  const user = await db.query.users.findFirst({
    where: eq(users.telegramIdHash, hashTelegramId(telegramId)),
  });

  if (!user?.dnsttSocksUsername || !config.dnsttTunnelDomain) {
    await ctx.reply(t(ctx.lang, "mykey_no_key"));
    return;
  }

  const dnsttSshDomain = `d3.${config.dnsttTunnelDomain}`;
  const { getTopResolvers } = await import("../../jobs/scan-dns-resolvers.js");
  const topResolvers = await getTopResolvers(3);
  const primaryIp = topResolvers[0]?.ip || config.dnsttDnsRelayIp || "1.1.1.1";
  const dnsResolver = `${primaryIp}:53`;

  await ctx.reply(t(ctx.lang, "dnstt_bot_ios_title"), { parse_mode: "HTML" });

  const steps = t(ctx.lang, "dnstt_bot_ios_steps", {
    dnsResolver,
    nameserver: dnsttSshDomain,
    pubkey: config.dnsttPubkey,
    sshUser: config.dnsttSshPassword ? "tunnel" : "",
    sshPass: config.dnsttSshPassword || "",
  });

  const keyboard = new InlineKeyboard()
    .url("\u{1F34E} HTTP Injector (App Store)", "https://apps.apple.com/app/http-injector/id1659992827")
    .row()
    .text("\u{2705} " + t(ctx.lang, "btn_done"), "setup:done");

  const backupIps = topResolvers.slice(1).map((r) => r.ip);
  const backupLine = backupIps.length > 0
    ? `\n\n${t(ctx.lang, "dnstt_backup_resolvers", { resolvers: backupIps.map((ip) => `${ip}:53`).join(", ") })}`
    : "";

  await ctx.reply(steps + backupLine, {
    parse_mode: "HTML",
    reply_markup: keyboard,
  });
}

// === NPV Tunnel (SSH-Direct) ===

export async function showNpvTunnelCallback(ctx: BotContext) {
  await ctx.answerCallbackQuery();

  if (config.npvServers.length === 0 || !config.dnsttSshPassword) {
    await ctx.reply("NPV Tunnel is not configured.");
    return;
  }

  const header = [
    `<b>🔗 NPV Tunnel (SSH-Direct)</b>`,
    ``,
    `${t(ctx.lang, "npv_warning")}`,
  ].join("\n");

  await ctx.reply(header, { parse_mode: "HTML" });

  // Send each server as a separate message for clarity
  for (const server of config.npvServers) {
    const serverMsg = [
      `<b>📡 ${server.name}</b>`,
      ``,
      `<b>Protocol:</b> <code>SSH-Direct</code>`,
      `<b>SSH Host:</b> <code>${server.sshHost}</code>`,
      `<b>SSH Port:</b> <code>${server.sshPort}</code>`,
      `<b>Udpgw Port:</b> <code>${server.udpgwPort}</code>`,
      `<b>SSH Username:</b> <code>tunnel</code>`,
      `<b>SSH Password:</b> <code>${config.dnsttSshPassword}</code>`,
      ``,
      `✅ Enable <b>UDPGW transparent DNS</b>`,
    ].join("\n");

    await ctx.reply(serverMsg, { parse_mode: "HTML" });
  }

  const keyboard = new InlineKeyboard()
    .text("📋 " + t(ctx.lang, "btn_dashboard"), "action:dashboard");

  await ctx.reply("Open the app, create a new config with <b>SSH-Direct</b> protocol, and enter the values above.", {
    parse_mode: "HTML",
    reply_markup: keyboard,
  });
}

// === MasterDNS Tunnel (extremely advanced) ===

export async function setupMasterDnsCallback(ctx: BotContext) {
  await ctx.answerCallbackQuery();

  if (!getBoolean("feature.masterDnsTunnel") || !config.masterDnsEncryptionKey || !config.dnsttTunnelDomain) {
    await ctx.reply(t(ctx.lang, "feature_disabled"));
    return;
  }

  await ctx.reply(t(ctx.lang, "masterdns_bot_warning"), { parse_mode: "HTML" });

  const keyboard = new InlineKeyboard()
    .text("\u{1F4F1} Android (Termux)", "setup:masterdns_android")
    .row()
    .text("\u{1F4BB} Windows / macOS / Linux", "setup:masterdns_desktop")
    .row()
    .text("\u{1F4CB} " + t(ctx.lang, "btn_dashboard"), "action:dashboard");

  await ctx.reply(t(ctx.lang, "masterdns_bot_platform_picker"), {
    parse_mode: "HTML",
    reply_markup: keyboard,
  });
}

export async function setupMasterDnsAndroidCallback(ctx: BotContext) {
  await ctx.answerCallbackQuery();

  const domain = `${config.masterDnsSubdomain}.${config.dnsttTunnelDomain}`;
  const termuxUrl = "https://github.com/masterking32/MasterDnsVPN/releases/latest/download/MasterDnsVPN_Client_Termux_ARM64.zip";

  await ctx.reply(t(ctx.lang, "masterdns_bot_android_steps", { downloadUrl: termuxUrl }), {
    parse_mode: "HTML",
  });

  // Send config values as copyable code
  await ctx.reply(t(ctx.lang, "masterdns_bot_config_values", {
    domain,
    key: config.masterDnsEncryptionKey,
  }), { parse_mode: "HTML" });

  // If web app domain is set, link to config download
  const webDomain = getString("web.appDomain");
  if (webDomain) {
    const keyboard = new InlineKeyboard()
      .url("\u{1F4E5} " + t(ctx.lang, "masterdns_download_config"), webDomain.replace(/\/app$/, "") + "/api/web/masterdns-config")
      .row()
      .text("\u{1F4CB} " + t(ctx.lang, "btn_dashboard"), "action:dashboard");

    await ctx.reply(t(ctx.lang, "masterdns_bot_proxy_hint"), {
      reply_markup: keyboard,
    });
  } else {
    const keyboard = new InlineKeyboard()
      .text("\u{1F4CB} " + t(ctx.lang, "btn_dashboard"), "action:dashboard");

    await ctx.reply(t(ctx.lang, "masterdns_bot_proxy_hint"), {
      reply_markup: keyboard,
    });
  }
}

export async function setupMasterDnsDesktopCallback(ctx: BotContext) {
  await ctx.answerCallbackQuery();

  const domain = `${config.masterDnsSubdomain}.${config.dnsttTunnelDomain}`;

  await ctx.reply(t(ctx.lang, "masterdns_bot_desktop_steps"), {
    parse_mode: "HTML",
  });

  await ctx.reply(t(ctx.lang, "masterdns_bot_config_values", {
    domain,
    key: config.masterDnsEncryptionKey,
  }), { parse_mode: "HTML" });

  const keyboard = new InlineKeyboard()
    .text("\u{1F4CB} " + t(ctx.lang, "btn_dashboard"), "action:dashboard");

  await ctx.reply(t(ctx.lang, "masterdns_bot_proxy_hint"), {
    reply_markup: keyboard,
  });
}

// === MTProto Proxy ===

export async function showMtprotoCallback(ctx: BotContext) {
  await ctx.answerCallbackQuery();

  if (!config.mtprotoSecret || !config.mtprotoServer) {
    await ctx.reply("MTProto proxy is not configured.");
    return;
  }

  const proxyUrl = `tg://proxy?server=${encodeURIComponent(config.mtprotoServer)}&port=443&secret=${encodeURIComponent(config.mtprotoSecret)}`;

  const keyboard = new InlineKeyboard()
    .url(t(ctx.lang, "mtproto_open_telegram"), proxyUrl)
    .row()
    .text(t(ctx.lang, "btn_dashboard"), "action:dashboard");

  await ctx.reply(t(ctx.lang, "mtproto_bot_message"), {
    parse_mode: "HTML",
  });

  // Send link as copyable text
  await ctx.reply(`<code>${proxyUrl}</code>`, { parse_mode: "HTML" });

  // Send QR code
  try {
    const qrPng = generateQrPng(proxyUrl);
    await ctx.replyWithPhoto(new InputFile(qrPng, "telegram-proxy-qr.png"), {
      caption: t(ctx.lang, "mtproto_qr_hint"),
      reply_markup: keyboard,
    });
  } catch {
    await ctx.reply(t(ctx.lang, "mtproto_qr_hint"), { reply_markup: keyboard });
  }
}

// === Dashboard — full overview like web app ===

export async function showDashboard(ctx: BotContext) {
  const telegramId = ctx.from?.id?.toString();
  if (!telegramId) return;

  const user = await db.query.users.findFirst({
    where: eq(users.telegramIdHash, hashTelegramId(telegramId)),
  });

  if (!user || !user.isActive) {
    await ctx.reply(t(ctx.lang, "mykey_no_key"));
    return;
  }

  const hasMasterDns = getBoolean("feature.masterDnsTunnel") && !!config.masterDnsEncryptionKey && !!config.dnsttTunnelDomain;
  const emergency = getBoolean("feature.networkEmergency");
  const masterDnsPrimary = hasMasterDns && emergency;
  const keyboard = new InlineKeyboard();

  // MasterDNS first (primary, recommended) only during a network emergency
  if (masterDnsPrimary) {
    keyboard.text(t(ctx.lang, "btn_masterdns_recommended"), "setup:app_masterdns").row();
  }

  // sing-box (always show if user has sub)
  const singboxUrl = getSingboxUrl(user);
  if (singboxUrl) {
    keyboard.text("\u{1F4E6} sing-box", "action:show_singbox_card").row();
    keyboard.text("\u{1F4E6} Hiddify", "action:show_hiddify_card").row();
  }

  // V2rayNG
  if (user.marzbanSubUrl) {
    keyboard.text(t(ctx.lang, "btn_v2ray_sub"), "action:show_v2ray_sub").row();
  }

  // AmneziaVPN
  if (user.amneziaWgConfig || user.ovpnCloakConfig) {
    keyboard.text(t(ctx.lang, "btn_show_awg_config"), "action:show_awg_config").row();
  }

  // MasterDNS de-emphasized (when not in emergency, it's just another backup tunnel)
  if (hasMasterDns && !masterDnsPrimary) {
    keyboard.text(t(ctx.lang, "btn_show_masterdns"), "setup:app_masterdns").row();
  }

  // Backup Tunnels (DNS Tunnel + NPV Tunnel)
  const dashHasDnstt = user.dnsttSocksUsername && config.dnsttTunnelDomain && getBoolean("feature.dnstt");
  const dashHasNpv = getBoolean("feature.npvTunnel") && config.npvServers.length > 0 && config.dnsttSshPassword;
  if (dashHasDnstt || dashHasNpv) {
    keyboard.text(t(ctx.lang, "btn_show_backup_tunnels"), "setup:app_backup_tunnels").row();
  }

  // MTProto Proxy
  if (getBoolean("feature.mtprotoProxy") && config.mtprotoSecret && config.mtprotoServer) {
    keyboard.text(t(ctx.lang, "btn_show_mtproto"), "action:show_mtproto").row();
  }

  // Footer actions
  keyboard.text(t(ctx.lang, "btn_my_invite_link"), "action:invite").row();
  keyboard.text(t(ctx.lang, "btn_help"), "action:help");

  // Prepend status banner only during a network emergency
  const title = masterDnsPrimary
    ? t(ctx.lang, "bot_network_status") + "\n\n" + t(ctx.lang, "bot_other_options_note")
    : t(ctx.lang, "dashboard_title");

  await ctx.reply(title, {
    parse_mode: "HTML",
    reply_markup: keyboard,
  });
}

/** Show sing-box card with deep link and copy */
export async function showSingboxCardCallback(ctx: BotContext) {
  await ctx.answerCallbackQuery();
  const telegramId = ctx.from?.id?.toString();
  if (!telegramId) return;

  const user = await db.query.users.findFirst({
    where: eq(users.telegramIdHash, hashTelegramId(telegramId)),
  });
  if (!user) return;

  const singboxUrl = getSingboxUrl(user);
  if (!singboxUrl) return;

  await showSubLink(ctx, singboxUrl, "singbox");
}

/** Show Hiddify card with deep link and copy */
export async function showHiddifyCardCallback(ctx: BotContext) {
  await ctx.answerCallbackQuery();
  const telegramId = ctx.from?.id?.toString();
  if (!telegramId) return;

  const user = await db.query.users.findFirst({
    where: eq(users.telegramIdHash, hashTelegramId(telegramId)),
  });
  if (!user) return;

  const hiddifyUrl = getHiddifyUrl(user) || getSingboxUrl(user);
  if (!hiddifyUrl) return;

  await showSubLink(ctx, hiddifyUrl, "hiddify");
}
