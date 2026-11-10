import type { FeatureFlags, UserProfile } from "./api";
import type { Language } from "./i18n";

export type ChosenApp = "singbox" | "hiddify" | "amneziavpn";
export type Platform = "ios" | "android" | "desktop";

/** Mutable app state shared by screens and bindings. */
export const state: {
  lang: Language;
  profile: UserProfile | null;
  flags: FeatureFlags | null;
  chosenApp: ChosenApp | null;
} = {
  lang: "pi",
  profile: null,
  flags: null,
  chosenApp: null,
};

/** Standard VPN protocols are being actively blocked: MasterDNS is surfaced first. */
export function isNetworkEmergency(): boolean {
  return state.flags?.["feature.networkEmergency"] === true;
}

/** Optional community/support channel link from admin settings (web.communityLink). */
export function communityLink(): string {
  const link = state.flags?.["web.communityLink"];
  return typeof link === "string" && /^https?:\/\//.test(link) ? link : "";
}
