import { eq } from "drizzle-orm";
import type { BotContext } from "../context.js";
import { db } from "../../db/index.js";
import { users } from "../../db/schema.js";
import { t } from "../../i18n/translations.js";
import { hashTelegramId } from "../../utils/hash.js";
import { marzban } from "../../marzban/instance.js";

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

export async function statusCommand(ctx: BotContext) {
  const telegramId = ctx.from?.id?.toString();
  if (!telegramId) return;

  const user = await db.query.users.findFirst({
    where: eq(users.telegramIdHash, hashTelegramId(telegramId)),
  });

  if (!user?.marzbanUsername && !user?.amneziaWgPeerId && !user?.shadowTlsUsername && !user?.ovpnCloakConfig) {
    await ctx.reply(t(ctx.lang, "status_no_key"));
    return;
  }

  // Fetch bandwidth and server status
  let bandwidth = "N/A";
  let serverStatus = "unreachable";
  let totalBytes = 0;

  if (marzban && user.marzbanUsername) {
    try {
      const mUser = await marzban.getUser(user.marzbanUsername);
      totalBytes += mUser.used_traffic;
      if (serverStatus === "unreachable") serverStatus = "online";
    } catch {
      // Marzban may not be available
    }
  }

  if (totalBytes > 0) bandwidth = formatBytes(totalBytes);

  const invitesRemaining = user.maxReferrals - user.referralCount;

  await ctx.reply(
    t(ctx.lang, "status_message", {
      referralCode: user.referralCode || "—",
      keyStatus: user.isActive ? "active" : "revoked",
      bandwidth,
      createdAt: user.createdAt,
      invitesRemaining: invitesRemaining.toString(),
      serverStatus,
    }),
    { parse_mode: "HTML" },
  );
}
