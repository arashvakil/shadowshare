import type { NextFunction } from "grammy";
import { eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import { users } from "../../db/schema.js";
import { hashTelegramId } from "../../utils/hash.js";
import type { BotContext } from "../context.js";

export async function loadLanguage(ctx: BotContext, next: NextFunction) {
  const telegramId = ctx.from?.id?.toString();
  if (telegramId) {
    const user = await db.query.users.findFirst({
      where: eq(users.telegramIdHash, hashTelegramId(telegramId)),
    });
    ctx.lang = (user?.language as "en" | "fa" | "pi") ?? "pi";
  } else {
    ctx.lang = "pi";
  }
  await next();
}
