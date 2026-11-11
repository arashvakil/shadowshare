import { eq, sql } from "drizzle-orm";
import { randomBytes } from "node:crypto";
import { InlineKeyboard } from "grammy";
import type { BotContext } from "../context.js";
import { db } from "../../db/index.js";
import { users } from "../../db/schema.js";
import { t } from "../../i18n/translations.js";
import { provisionUser, syncAfterDbChange } from "../../vpn/provider.js";
import { config } from "../../config.js";
import { hashTelegramId } from "../../utils/hash.js";
import { sendSetupStep1 } from "./setup.js";
import { getNumber, getBoolean, getString } from "../../settings.js";

function generateReferralCode(): string {
  const len = getNumber("bot.referralCodeLength");
  return randomBytes(len).toString("hex").toLowerCase();
}

export async function redeemReferral(ctx: BotContext, referralCode: string) {
  if (!getBoolean("feature.referralSystem")) {
    await ctx.reply(t(ctx.lang, "feature_disabled"));
    return;
  }

  if (!getBoolean("feature.registrationOpen")) {
    const contact = getString("web.supportContact");
    await ctx.reply(t(ctx.lang, "registration_closed") + (contact ? `\n${contact}` : ""));
    return;
  }

  const telegramId = ctx.from?.id?.toString();
  if (!telegramId) return;

  const idHash = hashTelegramId(telegramId);

  // Check if user already has a key
  const existingUser = await db.query.users.findFirst({
    where: eq(users.telegramIdHash, idHash),
  });

  if (existingUser?.marzbanUsername || existingUser?.amneziaWgPeerId || existingUser?.shadowTlsUsername || existingUser?.ovpnCloakConfig) {
    if (existingUser.isActive) {
      const keyboard = new InlineKeyboard().text(
        t(ctx.lang, "btn_show_my_key"),
        "action:show_key",
      );
      await ctx.reply(t(ctx.lang, "already_has_key"), {
        reply_markup: keyboard,
      });
    } else {
      await ctx.reply(t(ctx.lang, "mykey_revoked"));
    }
    return;
  }

  // Find referrer by referral code
  const referrer = await db.query.users.findFirst({
    where: eq(users.referralCode, referralCode),
  });

  if (!referrer || !referrer.isActive) {
    await ctx.reply(t(ctx.lang, "invalid_referral"));
    return;
  }

  // Don't allow self-referral
  if (referrer.telegramIdHash === idHash) {
    await ctx.reply(t(ctx.lang, "invalid_referral"));
    return;
  }

  // Check if referrer has remaining invites (admins get unlimited)
  const isAdmin = config.adminTelegramIds
    .map(hashTelegramId)
    .includes(referrer.telegramIdHash);
  if (!isAdmin && referrer.referralCount >= referrer.maxReferrals) {
    await ctx.reply(t(ctx.lang, "referral_full"));
    return;
  }

  try {
    // Show progress message immediately so user isn't staring at nothing
    const progressMsg = await ctx.reply(t(ctx.lang, "getkey_creating"));

    // Create VPN keys on all available providers
    const newReferralCode = generateReferralCode();
    const keyName = `user:${newReferralCode}`;
    const provision = await provisionUser(keyName);

    if (existingUser) {
      // User record exists but no key yet
      await db
        .update(users)
        .set({
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
          hysteria2Password: provision.hysteria2Password,
          tuicUuid: provision.tuicUuid,
          tuicPassword: provision.tuicPassword,
          trojanPassword: provision.trojanPassword,
          dnsttSocksUsername: provision.dnsttSocksUsername,
          dnsttSocksPassword: provision.dnsttSocksPassword,
          sshPublicKey: provision.sshPublicKey,
          sshPrivateKey: provision.sshPrivateKey,
          mieruUsername: provision.mieruUsername,
          mieruPassword: provision.mieruPassword,
          referredBy: referrer.id,
          referralCode: newReferralCode,
          isActive: true,
        })
        .where(eq(users.telegramIdHash, idHash));
    } else {
      await db.insert(users).values({
        telegramIdHash: idHash,
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
        hysteria2Password: provision.hysteria2Password,
        tuicUuid: provision.tuicUuid,
        tuicPassword: provision.tuicPassword,
        trojanPassword: provision.trojanPassword,
        dnsttSocksUsername: provision.dnsttSocksUsername,
        dnsttSocksPassword: provision.dnsttSocksPassword,
        sshPublicKey: provision.sshPublicKey,
        sshPrivateKey: provision.sshPrivateKey,
        mieruUsername: provision.mieruUsername,
        mieruPassword: provision.mieruPassword,
        referredBy: referrer.id,
        referralCode: newReferralCode,
        language: ctx.lang,
      });
    }

    // Increment referrer's count
    await db
      .update(users)
      .set({ referralCount: sql`${users.referralCount} + 1` })
      .where(eq(users.id, referrer.id));

    // Sync configs AFTER DB insert so new credentials are included
    syncAfterDbChange(provision);

    // Edit the progress message into the success message
    await ctx.api.editMessageText(
      progressMsg.chat.id,
      progressMsg.message_id,
      t(ctx.lang, "getkey_success"),
    );
    await sendSetupStep1(ctx);
  } catch (err) {
    console.error("Failed to create VPN key:", err);
    await ctx.reply(t(ctx.lang, "getkey_error"));
  }
}
