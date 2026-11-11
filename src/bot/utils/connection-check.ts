import { eq } from "drizzle-orm";
import { type Api, type RawApi } from "grammy";
import { marzban } from "../../marzban/instance.js";
import { db } from "../../db/index.js";
import { users } from "../../db/schema.js";
import { hashTelegramId } from "../../utils/hash.js";
import { config } from "../../config.js";
import { t, type Language } from "../../i18n/translations.js";
import { getString } from "../../settings.js";

const POLL_INTERVAL_MS = 30_000; // 30 seconds
const MAX_POLLS = 20; // 10 minutes total

// Track which users are being monitored to avoid duplicates
const activeChecks = new Set<string>();

export function startConnectionCheck(
  api: Api<RawApi>,
  telegramId: string,
  marzbanUsername: string | null,
  language: Language,
) {
  if (activeChecks.has(telegramId)) return;
  if (!marzbanUsername) return;
  activeChecks.add(telegramId);

  let polls = 0;

  console.log(`[connection-check] Started for marzban=${marzbanUsername}`);

  const timer = setInterval(async () => {
    polls++;

    try {
      let hasTraffic = false;

      // Check Marzban traffic
      if (marzban && marzbanUsername) {
        try {
          const mUser = await marzban.getUser(marzbanUsername);
          if (mUser.used_traffic > 0) hasTraffic = true;
        } catch {
          // Marzban may not be available
        }
      }

      if (hasTraffic) {
        console.log(`[connection-check] Traffic detected, sending confirmation`);
        clearInterval(timer);
        activeChecks.delete(telegramId);

        // Re-fetch user for latest language preference and referral code
        const user = await db.query.users.findFirst({
          where: eq(users.telegramIdHash, hashTelegramId(telegramId)),
        });
        const lang = (user?.language as Language) ?? language;

        // Build invite link — prefer web app URL if configured
        const appDomain = getString("web.appDomain");
        const inviteLink = user?.referralCode
          ? (appDomain ? `${appDomain}?ref=${user.referralCode}` : `https://t.me/${config.botUsername}?start=ref_${user.referralCode}`)
          : null;
        const remaining = user ? user.maxReferrals - user.referralCount : 0;

        // Send congrats message
        await api.sendMessage(
          telegramId,
          t(lang, "connection_confirmed"),
        );

        // Send their invite link as a shareable message
        if (inviteLink && remaining > 0) {
          await api.sendMessage(
            telegramId,
            t(lang, "connection_share_invite", {
              remaining: remaining.toString(),
              link: inviteLink,
            }),
            { parse_mode: "Markdown" },
          );
        }
        return;
      }
    } catch (err) {
      console.error(`[connection-check] Poll error:`, err);
    }

    if (polls >= MAX_POLLS) {
      console.log(`[connection-check] Gave up after ${MAX_POLLS} polls`);
      clearInterval(timer);
      activeChecks.delete(telegramId);
    }
  }, POLL_INTERVAL_MS);
}
