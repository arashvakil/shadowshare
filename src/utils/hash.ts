import { createHmac } from "node:crypto";
import { config } from "../config.js";

export function hashTelegramId(rawId: string): string {
  return createHmac("sha256", config.telegramIdSalt)
    .update(rawId)
    .digest("hex");
}
