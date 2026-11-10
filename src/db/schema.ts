import { sql } from "drizzle-orm";
import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  telegramIdHash: text("telegram_id_hash").notNull().unique(),
  label: text("label"),
  marzbanUsername: text("marzban_username").unique(),
  marzbanSubUrl: text("marzban_sub_url"),
  amneziaWgPeerId: text("amneziawg_peer_id").unique(),
  amneziaWgConfig: text("amneziawg_config"),
  ovpnCloakConfig: text("ovpn_cloak_config"),
  naiveUsername: text("naive_username").unique(),
  naivePassword: text("naive_password"),
  shadowTlsUsername: text("shadowtls_username").unique(),
  shadowTlsPassword: text("shadowtls_password"),
  shadowTlsSsPassword: text("shadowtls_ss_password"),
  hysteria2Password: text("hysteria2_password"),
  tuicUuid: text("tuic_uuid").unique(),
  tuicPassword: text("tuic_password"),
  trojanPassword: text("trojan_password").unique(),
  dnsttSocksUsername: text("dnstt_socks_username").unique(),
  dnsttSocksPassword: text("dnstt_socks_password"),
  sshPublicKey: text("ssh_public_key").unique(),
  sshPrivateKey: text("ssh_private_key"),
  mieruUsername: text("mieru_username").unique(),
  mieruPassword: text("mieru_password"),
  referralCode: text("referral_code").unique(),
  referredBy: integer("referred_by").references((): any => users.id),
  referralCount: integer("referral_count").default(0).notNull(),
  maxReferrals: integer("max_referrals").default(10).notNull(),
  webToken: text("web_token").unique(),
  language: text("language", { enum: ["en", "fa", "pi"] })
    .default("pi")
    .notNull(),
  telegramLangCode: text("telegram_lang_code"),
  udpEnabled: integer("udp_enabled", { mode: "boolean" }).default(false).notNull(),
  isActive: integer("is_active", { mode: "boolean" }).default(true).notNull(),
  lastKnownBandwidth: integer("last_known_bandwidth").default(0).notNull(),
  lastActiveAt: text("last_active_at"),
  createdAt: text("created_at")
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
});

export const usageSnapshots = sqliteTable("usage_snapshots", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  outlineKeyId: text("outline_key_id").notNull(),
  bytesTransferred: integer("bytes_transferred").notNull(),
  keyLabel: text("key_label"),
  snapshotAt: text("snapshot_at")
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
});

export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  type: text("type", { enum: ["string", "number", "boolean"] })
    .default("string")
    .notNull(),
  category: text("category", { enum: ["bot", "feature", "service", "web"] })
    .default("bot")
    .notNull(),
  updatedAt: text("updated_at")
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
});

export const connectionSnapshots = sqliteTable("connection_snapshots", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
  provider: text("provider").notNull(),
  isOnline: integer("is_online").default(0).notNull(),
  bytesTransferred: integer("bytes_transferred").default(0).notNull(),
  snapshotAt: text("snapshot_at")
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
});

export const connectivityEvents = sqliteTable("connectivity_events", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  eventType: text("event_type").notNull(),
  severity: text("severity").notNull(),
  affectedCount: integer("affected_count").notNull(),
  totalActive: integer("total_active").notNull(),
  affectedProtocols: text("affected_protocols"),
  details: text("details"),
  createdAt: text("created_at")
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
});

export const dnsResolvers = sqliteTable("dns_resolvers", {
  ip: text("ip").primaryKey(),
  latencyMs: integer("latency_ms"),
  ednsSize: integer("edns_size"),
  rank: integer("rank").notNull(),
  verifiedAt: text("verified_at")
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
});

export const masterdnsUsageHistory = sqliteTable("masterdns_usage_history", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  snapshotAt: text("snapshot_at")
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
  activeSessions: integer("active_sessions").notNull().default(0),
  uploadBytesTotal: integer("upload_bytes_total").notNull().default(0),
  downloadBytesTotal: integer("download_bytes_total").notNull().default(0),
  dnstmRxBytes: integer("dnstm_rx_bytes").notNull().default(0),
  dnstmTxBytes: integer("dnstm_tx_bytes").notNull().default(0),
  singboxRxBytes: integer("singbox_rx_bytes").notNull().default(0),
  singboxTxBytes: integer("singbox_tx_bytes").notNull().default(0),
});

export type User = typeof users.$inferSelect;
export type UsageSnapshot = typeof usageSnapshots.$inferSelect;
export type Setting = typeof settings.$inferSelect;
export type ConnectionSnapshot = typeof connectionSnapshots.$inferSelect;
export type ConnectivityEvent = typeof connectivityEvents.$inferSelect;
export type DnsResolver = typeof dnsResolvers.$inferSelect;
export type MasterdnsUsageHistory = typeof masterdnsUsageHistory.$inferSelect;
