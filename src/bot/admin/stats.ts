import { eq, count } from "drizzle-orm";
import type { BotContext } from "../context.js";
import { db } from "../../db/index.js";
import { users } from "../../db/schema.js";
import { t } from "../../i18n/translations.js";
import { marzban } from "../../marzban/instance.js";

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

export async function statsCommand(ctx: BotContext) {
  try {
    const [totalResult] = await db
      .select({ count: count() })
      .from(users);

    const [activeResult] = await db
      .select({ count: count() })
      .from(users)
      .where(eq(users.isActive, true));

    let totalTransfer = "N/A";
    if (marzban) {
      try {
        let totalBytes = 0;
        for (let offset = 0; ; offset += 500) {
          const page = await marzban.getUsers(offset, 500);
          for (const mu of page.users) totalBytes += mu.lifetime_used_traffic || 0;
          if (page.users.length < 500) break;
        }
        totalTransfer = formatBytes(totalBytes);
      } catch {
        // Metrics may not be available
      }
    }

    await ctx.reply(
      t(ctx.lang, "admin_stats", {
        totalUsers: totalResult.count.toString(),
        activeKeys: activeResult.count.toString(),
        totalTransfer,
      }),
    );
  } catch (err) {
    console.error("Failed to get stats:", err);
    await ctx.reply(t(ctx.lang, "error_generic"));
  }
}
