import type { Context } from "grammy";
import type { Language } from "../i18n/translations.js";

export interface BotContext extends Context {
  lang: Language;
}
