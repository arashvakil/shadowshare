import type { Context, NextFunction } from "grammy";

const userTimestamps = new Map<string, number[]>();
const MAX_MESSAGES = 5;
const WINDOW_MS = 60_000;

export async function rateLimit(ctx: Context, next: NextFunction) {
  const userId = ctx.from?.id?.toString();
  if (!userId) return;

  const now = Date.now();
  const timestamps = userTimestamps.get(userId) || [];
  const recent = timestamps.filter((ts) => now - ts < WINDOW_MS);

  if (recent.length >= MAX_MESSAGES) {
    // Silently drop — don't spam the user with rate limit messages
    return;
  }

  recent.push(now);
  userTimestamps.set(userId, recent);
  await next();
}
