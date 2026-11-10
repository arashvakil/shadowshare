import { isRtl, t as translate, type Language } from "./i18n";
import { state, type ChosenApp, type Platform } from "./state";

/** Translate in the current language. */
export function t(key: string, vars?: Record<string, string | number>): string {
  return translate(state.lang, key, vars);
}

/** Escape a string for safe inclusion in HTML text or attribute values. */
export function escapeAttr(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/** Template tag that concatenates parts. Values are NOT escaped: wrap untrusted input in escapeAttr(). */
export function html(strings: TemplateStringsArray, ...values: unknown[]): string {
  return strings.reduce((result, str, i) => result + str + (values[i] ?? ""), "");
}

export function detectPlatform(): Platform {
  const ua = navigator.userAgent.toLowerCase();
  if (/iphone|ipad|ipod/.test(ua)) return "ios";
  if (/android/.test(ua)) return "android";
  return "desktop";
}

export function detectLanguage(): Language {
  const navLang = navigator.language?.toLowerCase() || "";
  if (navLang.startsWith("fa")) return "fa";
  if (navLang.startsWith("en")) return "en";
  return "pi";
}

export function setDir() {
  document.documentElement.dir = isRtl(state.lang) ? "rtl" : "ltr";
  document.documentElement.lang = state.lang === "fa" ? "fa" : state.lang === "pi" ? "fa-Latn" : "en";
}

export function getBaseUrl(): string {
  return `${location.origin}/app`;
}

export function getRefCodeFromUrl(): string {
  return new URLSearchParams(location.search).get("ref") || "";
}

export function buildDeepLink(app: ChosenApp, subUrl: string): string {
  const encoded = encodeURIComponent(subUrl);
  if (app === "hiddify") return `hiddify://import/${encoded}`;
  return `sing-box://import-remote-profile?url=${encoded}`;
}

/** Split a newline-separated translated list into <li> items, dropping "1." prefixes. */
export function listItems(text: string): string {
  return text
    .split("\n")
    // Strip "1." / "۱." / "١." prefixes (ASCII, Persian and Arabic-Indic digits).
    .map((s) => `<li>${s.replace(/^[\d\u06F0-\u06F9\u0660-\u0669]+[.)]\s*/, "")}</li>`)
    .join("");
}

// === Storage (can throw in private mode / blocked storage) ===

const TOKEN_KEY = "shadowshare_token";
export const ONBOARDING_KEY = "shadowshare_onboarding_done";

export function storageGet(key: string): string | null {
  try { return localStorage.getItem(key); } catch { return null; }
}
export function storageSet(key: string, value: string) {
  try { localStorage.setItem(key, value); } catch {}
}
export function storageRemove(key: string) {
  try { localStorage.removeItem(key); } catch {}
}

export function loadToken(): string | null {
  const hash = location.hash;
  if (hash.startsWith("#token=")) {
    const token = hash.slice(7);
    if (/^[a-f0-9]{64}$/i.test(token)) {
      storageSet(TOKEN_KEY, token);
      return token;
    }
  }
  return storageGet(TOKEN_KEY);
}

export function saveToken(token: string) {
  storageSet(TOKEN_KEY, token);
  location.hash = `#token=${token}`;
}

export function clearToken() {
  storageRemove(TOKEN_KEY);
  storageRemove(ONBOARDING_KEY);
  location.hash = "";
}

// === Downloads ===

function saveBlob(blob: Blob, filename: string) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

export async function downloadSingboxJson(url: string, filename = "sing-box.json") {
  try {
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const json = await resp.json();
    saveBlob(new Blob([JSON.stringify(json, null, 2)], { type: "application/json" }), filename);
  } catch (e) {
    console.error("Download failed:", e);
  }
}

/** Decode a vpn:// URI (base64url-encoded content) and trigger a file download. */
export function downloadVpnConfig(vpnUri: string, filename: string) {
  try {
    const raw = atob(vpnUri.replace(/^vpn:\/\//, "").replace(/-/g, "+").replace(/_/g, "/"));
    const bytes = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
    saveBlob(new Blob([bytes], { type: "application/octet-stream" }), filename);
  } catch (e) {
    console.error("Download failed:", e);
  }
}
