import { eq } from "drizzle-orm";
import { db } from "./db/index.js";
import { settings } from "./db/schema.js";
import { config } from "./config.js";
import { setMaxReferralsProvider } from "./db/defaults.js";

export interface SettingDefinition {
  key: string;
  defaultValue: string;
  type: "string" | "number" | "boolean";
  category: "bot" | "feature" | "service" | "web";
  description: string;
}

export const SETTING_DEFINITIONS: SettingDefinition[] = [
  // App settings
  { key: "bot.maxReferrals", defaultValue: String(config.maxReferrals), type: "number", category: "bot", description: "Default max invites for new users" },
  { key: "bot.snapshotIntervalHrs", defaultValue: "6", type: "number", category: "bot", description: "Usage snapshot frequency (hours)" },
  { key: "bot.sessionTtlHrs", defaultValue: "24", type: "number", category: "bot", description: "Admin session TTL (hours)" },
  { key: "bot.rateLimitAttempts", defaultValue: "5", type: "number", category: "bot", description: "Login attempts before lockout" },
  { key: "bot.rateLimitWindowMins", defaultValue: "15", type: "number", category: "bot", description: "Rate limit window (minutes)" },
  { key: "bot.shareMessageText", defaultValue: "Join me on this VPN!", type: "string", category: "bot", description: "Share button text in webapp" },
  { key: "bot.referralCodeLength", defaultValue: "4", type: "number", category: "bot", description: "Bytes of randomness (e.g. 4 = 8 hex chars)" },
  { key: "bot.connectivityPollMins", defaultValue: "5", type: "number", category: "bot", description: "Connectivity poll frequency (minutes)" },
  { key: "bot.disconnectThresholdPct", defaultValue: "50", type: "number", category: "bot", description: "Mass disconnect threshold (% of online users)" },
  { key: "bot.snapshotRetentionDays", defaultValue: "7", type: "number", category: "bot", description: "Connectivity snapshot retention (days)" },

  // Web app settings
  { key: "web.communityLink", defaultValue: "", type: "string", category: "web", description: "Optional community/support channel URL (e.g. a Telegram invite link). Hidden when empty." },
  { key: "web.supportContact", defaultValue: "", type: "string", category: "web", description: "Optional contact shown when registration is closed (e.g. @yourhandle or an email)." },
  { key: "web.appDomain", defaultValue: "", type: "string", category: "web", description: "Full web app URL for invite links (e.g. https://vpn.example.com/app)" },

  // Feature flags
  { key: "feature.referralSystem", defaultValue: "true", type: "boolean", category: "feature", description: "Enable referral-based distribution" },
  { key: "feature.qrCodes", defaultValue: "true", type: "boolean", category: "feature", description: "Show QR codes in webapp" },
  { key: "feature.languagePicker", defaultValue: "true", type: "boolean", category: "feature", description: "Show language picker" },
  { key: "feature.inviteLinks", defaultValue: "true", type: "boolean", category: "feature", description: "Allow admin invite creation" },
  { key: "feature.marzban", defaultValue: "true", type: "boolean", category: "feature", description: "Enable Marzban multi-protocol VPN" },
  { key: "feature.amneziaWg", defaultValue: "true", type: "boolean", category: "feature", description: "Enable AmneziaWG (WireGuard with obfuscation)" },
  { key: "feature.openvpnCloak", defaultValue: "false", type: "boolean", category: "feature", description: "Enable OpenVPN + Cloak (OpenVPN disguised as HTTPS via Cloak)" },
  { key: "feature.naiveProxy", defaultValue: "true", type: "boolean", category: "feature", description: "Enable NaiveProxy (Chromium-fingerprint HTTPS proxy)" },
  { key: "feature.shadowTls", defaultValue: "false", type: "boolean", category: "feature", description: "Enable ShadowTLS v3 + Shadowsocks via sing-box" },
  { key: "feature.hysteria2", defaultValue: "false", type: "boolean", category: "feature", description: "Enable Hysteria2 (QUIC/UDP) via sing-box" },
  { key: "feature.tuic", defaultValue: "false", type: "boolean", category: "feature", description: "Enable TUIC (QUIC/UDP) via sing-box" },
  { key: "feature.trojan", defaultValue: "false", type: "boolean", category: "feature", description: "Enable Trojan (TCP+TLS) via sing-box" },
  { key: "feature.dnstt", defaultValue: "false", type: "boolean", category: "feature", description: "Enable DNS tunnel fallback (Slipstream + DNSTT + NoizDNS)" },
  { key: "feature.npvTunnel", defaultValue: "false", type: "boolean", category: "feature", description: "Enable NPV Tunnel (direct SSH tunnel via NapsternetV/NpvTunnel)" },
  { key: "feature.masterDnsTunnel", defaultValue: "true", type: "boolean", category: "feature", description: "Enable MasterDNS Tunnel (advanced DNS tunnel, requires terminal — ~10x faster than DNSTT)" },
  { key: "feature.mieru", defaultValue: "false", type: "boolean", category: "feature", description: "Enable Mieru (TCP+UDP port-range multiplexing)" },
  { key: "feature.sshTunnel", defaultValue: "false", type: "boolean", category: "feature", description: "Enable SSH Tunnel with per-user ed25519 keys (Hiddify only)" },
  { key: "feature.naiveProxyQuic", defaultValue: "false", type: "boolean", category: "feature", description: "Enable NaiveProxy QUIC variant (direct UDP, exposes server IP)" },
  { key: "feature.mtprotoProxy", defaultValue: "false", type: "boolean", category: "feature", description: "Enable MTProto proxy for Telegram access (shared proxy link for all users)" },
  { key: "feature.strictRoute", defaultValue: "false", type: "boolean", category: "feature", description: "Inject strict_route into sing-box TUN (prevents traffic leaks on iOS/Android)" },
  { key: "feature.networkEmergency", defaultValue: "false", type: "boolean", category: "feature", description: "Network emergency mode: highlight MasterDNS Tunnel as the primary 'works now' option and mark direct VPN apps as currently unreliable. Turn off once standard protocols work again." },
  { key: "feature.webApp", defaultValue: "true", type: "boolean", category: "feature", description: "Enable standalone web app" },
  { key: "feature.registrationOpen", defaultValue: "true", type: "boolean", category: "feature", description: "Allow new user registration (disable to block new signups)" },

  // Service toggles
  { key: "service.bot", defaultValue: "false", type: "boolean", category: "service", description: "Run the Telegram bot (also needs BOT_TOKEN; restart to apply)" },
  { key: "service.api", defaultValue: "true", type: "boolean", category: "service", description: "Web API on/off" },
  { key: "service.dnsResolvers", defaultValue: "", type: "string", category: "service", description: "Comma-separated Iranian DNS resolver IPs for DNSTT (e.g. 10.x.x.x,217.x.x.x). Takes priority over auto-scan." },
];

// In-memory cache
const cache = new Map<string, string>();

// Build a lookup map for definitions
const definitionMap = new Map<string, SettingDefinition>();
for (const def of SETTING_DEFINITIONS) {
  definitionMap.set(def.key, def);
}

/** Load all persisted settings into cache. Call once at startup. */
export async function initSettings(): Promise<void> {
  const rows = await db.select().from(settings);
  for (const row of rows) {
    cache.set(row.key, row.value);
  }
  console.log(`Settings loaded: ${rows.length} persisted, ${SETTING_DEFINITIONS.length} defined`);
}

/** Get raw string value for a setting key. */
function getRaw(key: string): string {
  const cached = cache.get(key);
  if (cached !== undefined) return cached;
  const def = definitionMap.get(key);
  return def ? def.defaultValue : "";
}

/** Get a string setting. */
export function getString(key: string): string {
  return getRaw(key);
}

/** Get a numeric setting. */
export function getNumber(key: string): number {
  const val = getRaw(key);
  const num = parseFloat(val);
  return isNaN(num) ? 0 : num;
}

/** Get a boolean setting. */
export function getBoolean(key: string): boolean {
  return getRaw(key) === "true";
}

// New users get the admin-configured invite allowance (see db/defaults.ts).
setMaxReferralsProvider(() => getNumber("bot.maxReferrals"));

/** Get all settings with their current values and metadata. */
export function getAllSettings(): Array<SettingDefinition & { currentValue: string }> {
  return SETTING_DEFINITIONS.map((def) => ({
    ...def,
    currentValue: getRaw(def.key),
  }));
}

/** Update multiple settings. Returns list of keys that were updated. */
export async function updateSettings(
  updates: Record<string, string>,
): Promise<string[]> {
  const updated: string[] = [];
  const now = new Date().toISOString();

  for (const [key, value] of Object.entries(updates)) {
    const def = definitionMap.get(key);
    if (!def) continue;

    // Type validation
    if (def.type === "number" && isNaN(parseFloat(value))) continue;
    if (def.type === "boolean" && value !== "true" && value !== "false") continue;

    // Upsert into DB
    await db
      .insert(settings)
      .values({ key, value, type: def.type, category: def.category, updatedAt: now })
      .onConflictDoUpdate({
        target: settings.key,
        set: { value, updatedAt: now },
      });

    // Update cache
    cache.set(key, value);
    updated.push(key);
  }

  return updated;
}
