import type { Context, NextFunction } from "grammy";
import { config } from "../../config.js";

export async function adminOnly(ctx: Context, next: NextFunction) {
  const telegramId = ctx.from?.id?.toString();
  if (!telegramId || !config.adminTelegramIds.includes(telegramId)) {
    await ctx.reply("You are not authorized to use admin commands.");
    return;
  }
  await next();
}
