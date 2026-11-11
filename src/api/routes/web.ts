import { Hono } from "hono";
import { eq, sql } from "drizzle-orm";
import { randomBytes, createHmac } from "node:crypto";
import { deflateRawSync, crc32 } from "node:zlib";
import { Agent as UndiciAgent } from "undici";
import { db } from "../../db/index.js";
import { users } from "../../db/schema.js";
import { provisionUser, syncAfterDbChange } from "../../vpn/provider.js";
import { config } from "../../config.js";
import { getBoolean, getString } from "../../settings.js";
import { checkRateLimit } from "../web-rate-limit.js";
import { webAuth, type WebAppEnv } from "../web-auth.js";
import { singbox } from "../../singbox/instance.js";
import { buildAwgVpnUri } from "../../amneziawg/vpn-uri.js";
import { marzban } from "../../marzban/instance.js";
import { naiveProxy } from "../../naiveproxy/instance.js";
import { sshTunnel } from "../../ssh-tunnel/instance.js";
import { mieru } from "../../mieru/instance.js";
import { getTopResolvers, scanStats } from "../../jobs/scan-dns-resolvers.js";

// For fetching Marzban subscription with self-signed cert
const tlsSkipAgent = new UndiciAgent({ connect: { rejectUnauthorized: false } });

const app = new Hono<WebAppEnv>();

/**
 * Migrate legacy sing-box special outbounds (block, dns) to route actions.
 * Deprecated in 1.11.0, removed in 1.13.0.
 * - "block" outbound → route rule action: "reject"
 * - "dns" outbound → route rule action: "hijack-dns" (with sniff action added)
 */
function migrateLegacyOutbounds(cfg: any): void {
  if (!cfg?.outbounds || !cfg?.route?.rules) return;

  const blockTags = new Set<string>();
  const dnsTags = new Set<string>();

  // Identify legacy outbounds
  cfg.outbounds = cfg.outbounds.filter((o: any) => {
    if (o.type === "block") { blockTags.add(o.tag); return false; }
    if (o.type === "dns") { dnsTags.add(o.tag); return false; }
    return true;
  });

  if (blockTags.size === 0 && dnsTags.size === 0) return;

  // Remove sniff from inbounds (handled by route action now)
  if (cfg.inbounds) {
    for (const inb of cfg.inbounds) {
      delete inb.sniff;
      delete inb.sniff_override_destination;
    }
  }

  // Transform route rules
  const newRules: any[] = [{ action: "sniff" }];

  for (const rule of cfg.route.rules) {
    if (rule.outbound && dnsTags.has(rule.outbound)) {
      // dns outbound rule → hijack-dns action
      const { outbound, ...rest } = rule;
      newRules.push({ ...rest, action: "hijack-dns" });
    } else if (rule.outbound && blockTags.has(rule.outbound)) {
      // block outbound rule → reject action
      const { outbound, ...rest } = rule;
      newRules.push({ ...rest, action: "reject" });
    } else {
      newRules.push(rule);
    }
  }

  cfg.route.rules = newRules;

  // Remove block/dns tags from selector outbound lists
  for (const o of cfg.outbounds) {
    if (o.outbounds && Array.isArray(o.outbounds)) {
      o.outbounds = o.outbounds.filter((tag: string) => !blockTags.has(tag) && !dnsTags.has(tag));
    }
  }
}

function generateWebToken(): string {
  return randomBytes(32).toString("hex");
}

function generateReferralCode(): string {
  return randomBytes(4).toString("hex").toLowerCase();
}

/** Create a synthetic telegramIdHash for web-only users: web:<hash of token> */
function webIdHash(token: string): string {
  return (
    "web:" +
    createHmac("sha256", config.telegramIdSalt).update(token).digest("hex")
  );
}

async function buildProfile(user: typeof users.$inferSelect) {
  const remaining = Math.max(0, user.maxReferrals - user.referralCount);

  let amneziaVpnUri: string | null = null;
  if (user.isActive && user.amneziaWgConfig) {
    amneziaVpnUri = buildAwgVpnUri(user.amneziaWgConfig);
  }

  // Unified sing-box subscription URL: includes VLESS + ShadowTLS + Hysteria2 + TUIC + Trojan + Shadowsocks
  const hasSingbox = !!(user.marzbanSubUrl || user.shadowTlsUsername || user.hysteria2Password || user.tuicUuid || user.trojanPassword);
  const singboxUrl = user.isActive && hasSingbox ? `/api/web/singbox?token=${user.webToken}` : null;

  // V2Ray subscription URL (for V2rayNG, Hiddify Xray mode) — includes XHTTP
  // Convert absolute Marzban URL to relative /r/TOKEN so it works from any domain
  const v2raySubUrl = user.isActive && user.marzbanSubUrl
    ? user.marzbanSubUrl.replace(/^https?:\/\/[^/]+/, "")
    : null;

  // Hiddify subscription URL — separate endpoint returning base64-encoded URI list
  // Includes NaiveProxy, SSH, Mieru protocols that only Hiddify supports
  const hasHiddify = !!(user.marzbanSubUrl || user.shadowTlsUsername || user.naiveUsername || user.sshPublicKey || user.mieruUsername);
  const hiddifySubUrl = user.isActive && hasHiddify ? `/api/web/hiddify?token=${user.webToken}` : null;

  // Get top DNS resolvers from periodic scan results (falls back to env var or 8.8.8.8)
  const scannedResolvers = config.dnsttTunnelDomain ? await getTopResolvers(3) : [];
  const primaryDnsIp =
    scannedResolvers[0]?.ip || config.dnsttDnsRelayIp || null;

  // Generate slipnet:// deep link URIs for one-tap SlipNet import
  function buildSlipnetUri(tunnelType: string, domain: string, socksUser: string, socksPass: string): string {
    const dnsResolver = primaryDnsIp ? `${primaryDnsIp}:53:0` : "8.8.8.8:53:0";
    const fields = [
      "17", tunnelType, "ShadowShare", domain,
      dnsResolver, "0", "5000", "bbr", "1080", "127.0.0.1", "0",
      config.dnsttPubkey, socksUser, socksPass,
      "0", "", "", "22", "0", "127.0.0.1", "0", "",
      "udp", "password", "", "", "", "0", "443", "", "",
      "0", "", "0", "0", "", "0", "",
    ];
    return "slipnet://" + Buffer.from(fields.join("|")).toString("base64");
  }

  // NPV Tunnel config (shared SSH credentials — no per-user data needed)
  // Supports multiple servers via npvServers array
  const npvTunnelServers = user.isActive && config.dnsttSshPassword && getBoolean("feature.npvTunnel") && config.npvServers.length > 0
    ? config.npvServers.map(s => ({
        name: s.name,
        sshHost: s.sshHost,
        sshPort: s.sshPort,
        udpgwPort: s.udpgwPort,
        sshUsername: "tunnel",
        sshPassword: config.dnsttSshPassword,
      }))
    : null;
  // Backward compat: single config for old clients
  const npvTunnelConfig = npvTunnelServers?.[0] || null;

  const dnsttDomain = `${config.dnsttDnsttDomain}.${config.dnsttTunnelDomain}`;
  const dnsttSshDomain = `d3.${config.dnsttTunnelDomain}`;
  const dnsttConfig = user.isActive && user.dnsttSocksUsername && config.dnsttTunnelDomain ? {
    tunnelDomain: config.dnsttTunnelDomain,
    slipstreamDomain: `${config.dnsttSlipstreamDomain}.${config.dnsttTunnelDomain}`,
    dnsttDomain,
    dnsttSshDomain,
    pubkey: config.dnsttPubkey,
    dohUrl: primaryDnsIp ? primaryDnsIp : "https://cloudflare-dns.com/dns-query",
    dnsRelayIp: primaryDnsIp || undefined,
    dnsResolvers: scannedResolvers.length > 0 ? scannedResolvers.map((r) => r.ip) : undefined,
    resolverUpdatedAt: scanStats.lastScanAt || undefined,
    socksUsername: user.dnsttSocksUsername,
    socksPassword: user.dnsttSocksPassword,
    sshUsername: config.dnsttSshPassword ? "tunnel" : undefined,
    sshPassword: config.dnsttSshPassword || undefined,
    xrayUuid: config.dnsttXrayUuid || undefined,
    slipnetDnsttUri: buildSlipnetUri("dnstt", dnsttDomain, user.dnsttSocksUsername!, user.dnsttSocksPassword!),
  } : null;

  // MasterDNS Tunnel config (shared — same key for all users, like MTProto)
  const masterDnsConfig = user.isActive && getBoolean("feature.masterDnsTunnel") && config.masterDnsEncryptionKey && config.dnsttTunnelDomain
    ? {
        tunnelDomain: `${config.masterDnsSubdomain}.${config.dnsttTunnelDomain}`,
        encryptionKey: config.masterDnsEncryptionKey,
        configDownloadUrl: `/api/web/masterdns-config?token=${user.webToken}`,
        dnsResolvers: scannedResolvers.length > 0 ? scannedResolvers.map((r) => r.ip) : ["8.8.8.8", "1.1.1.1"],
        resolverUpdatedAt: scanStats.lastScanAt || undefined,
      }
    : null;

  // MTProto Proxy (shared — same link for all users)
  const mtprotoProxyUrl = user.isActive && getBoolean("feature.mtprotoProxy") && config.mtprotoSecret && config.mtprotoServer
    ? `tg://proxy?server=${encodeURIComponent(config.mtprotoServer)}&port=443&secret=${encodeURIComponent(config.mtprotoSecret)}`
    : null;

  return {
    language: user.language,
    hasKey: !!(user.marzbanUsername || user.amneziaWgPeerId || user.naiveUsername || user.shadowTlsUsername || user.hysteria2Password || user.tuicUuid || user.trojanPassword || user.ovpnCloakConfig || user.dnsttSocksUsername || user.sshPublicKey || user.mieruUsername) && user.isActive,
    isActive: user.isActive,
    singboxUrl,
    v2raySubUrl,
    hiddifySubUrl,
    amneziaVpnUri,
    amneziaQrData: amneziaVpnUri,
    ovpnCloakVpnUri: user.isActive && user.ovpnCloakConfig
      ? "vpn://" + Buffer.from(user.ovpnCloakConfig).toString("base64url")
      : null,
    dnsttConfig,
    npvTunnelConfig,
    npvTunnelServers,
    masterDnsConfig,
    mtprotoProxyUrl,
    referralCode: user.referralCode,
    referralCount: user.referralCount,
    maxReferrals: user.maxReferrals,
    remainingInvites: remaining,
    inviteDomain: getString("web.appDomain") || null,
  };
}

/**
 * POST /api/web/redeem — enter referral code, provision keys, return webToken.
 * No auth required. Rate-limited by IP.
 */
app.post("/redeem", async (c) => {
  if (!getBoolean("feature.webApp")) {
    return c.json({ error: "Web app is disabled" }, 503);
  }

  if (!getBoolean("feature.registrationOpen")) {
    return c.json({ error: "registration_closed" }, 403);
  }

  // Referral system gates new-user creation the same way the bot does
  // (src/bot/commands/getkey.ts) — keep the toggle consistent across surfaces.
  if (!getBoolean("feature.referralSystem")) {
    return c.json({ error: "registration_closed" }, 403);
  }

  // Rate limit by IP — prefer CF-Connecting-IP (set by Cloudflare, can't be spoofed)
  const ip =
    c.req.header("cf-connecting-ip") ||
    c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown";
  if (!checkRateLimit(ip)) {
    return c.json({ error: "rate_limited" }, 429);
  }

  const body = await c.req.json<{ referralCode: string; language?: string }>();
  const { referralCode, language } = body;

  if (!referralCode) {
    return c.json({ error: "missing_referral_code" }, 400);
  }

  // Normalize referral code (strip ref_ prefix, full link, etc.)
  const code = referralCode
    .trim()
    .replace(/^.*ref_/, "")
    .replace(/^ref_/, "")
    .toLowerCase();

  if (!code || !/^[a-f0-9]{8}$/.test(code)) {
    return c.json({ error: "invalid_referral" }, 400);
  }

  // Find referrer
  const referrer = await db.query.users.findFirst({
    where: eq(users.referralCode, code),
  });

  if (!referrer || !referrer.isActive) {
    return c.json({ error: "invalid_referral" }, 400);
  }

  // Check invite limit
  if (referrer.referralCount >= referrer.maxReferrals) {
    return c.json({ error: "referral_full" }, 400);
  }

  try {
    const webToken = generateWebToken();
    const idHash = webIdHash(webToken);
    const newReferralCode = generateReferralCode();
    const keyName = `user:${newReferralCode}`;
    const provision = await provisionUser(keyName);

    const lang =
      language && ["en", "fa", "pi"].includes(language)
        ? (language as "en" | "fa" | "pi")
        : "pi";

    await db.insert(users).values({
      telegramIdHash: idHash,
      webToken,
      marzbanUsername: provision.marzbanUsername,
      marzbanSubUrl: provision.marzbanSubUrl,
      amneziaWgPeerId: provision.amneziaWgPeerId,
      amneziaWgConfig: provision.amneziaWgConfig,
      ovpnCloakConfig: provision.ovpnCloakConfig,
      naiveUsername: provision.naiveUsername,
      naivePassword: provision.naivePassword,
      shadowTlsUsername: provision.shadowTlsUsername,
      shadowTlsPassword: provision.shadowTlsPassword,
      shadowTlsSsPassword: provision.shadowTlsSsPassword,
      hysteria2Password: provision.hysteria2Password,
      tuicUuid: provision.tuicUuid,
      tuicPassword: provision.tuicPassword,
      trojanPassword: provision.trojanPassword,
      dnsttSocksUsername: provision.dnsttSocksUsername,
      dnsttSocksPassword: provision.dnsttSocksPassword,
      sshPublicKey: provision.sshPublicKey,
      sshPrivateKey: provision.sshPrivateKey,
      mieruUsername: provision.mieruUsername,
      mieruPassword: provision.mieruPassword,
      referredBy: referrer.id,
      referralCode: newReferralCode,
      language: lang,
    });

    // Increment referrer count
    await db
      .update(users)
      .set({ referralCount: sql`${users.referralCount} + 1` })
      .where(eq(users.id, referrer.id));

    // Sync configs AFTER DB insert so new credentials are included
    syncAfterDbChange(provision);

    const newUser = await db.query.users.findFirst({
      where: eq(users.webToken, webToken),
    });

    return c.json({
      webToken,
      ...(await buildProfile(newUser!)),
    });
  } catch (err) {
    console.error("[web] Failed to provision user:", err);
    return c.json({ error: "server_error" }, 500);
  }
});

/**
 * GET /api/web/me — load profile for returning web users.
 * Requires Bearer token auth.
 */
app.get("/me", webAuth, async (c) => {
  const user = c.get("webUser");
  return c.json(await buildProfile(user));
});

/**
 * POST /api/web/language — change language.
 * Requires Bearer token auth.
 */
app.post("/language", webAuth, async (c) => {
  const user = c.get("webUser");
  const body = await c.req.json<{ language: string }>();
  const { language } = body;

  const VALID = ["en", "fa", "pi"] as const;
  if (!language || !VALID.includes(language as any)) {
    return c.json({ error: "invalid_language" }, 400);
  }

  await db
    .update(users)
    .set({ language: language as (typeof VALID)[number] })
    .where(eq(users.id, user.id));

  return c.json({ ok: true, language });
});

/**
 * GET /api/web/singbox — unified sing-box subscription.
 * Fetches Marzban sing-box config, injects ShadowTLS + Shadowsocks outbounds,
 * returns a single config the user adds as ONE Remote profile.
 * Token in query param so sing-box can fetch it directly.
 */
app.get("/singbox", async (c) => {
  const token = c.req.query("token");
  if (!token || token.length !== 64) {
    return c.json({ error: "Invalid token" }, 401);
  }

  const user = await db.query.users.findFirst({
    where: eq(users.webToken, token),
  });

  if (!user || !user.isActive) {
    return c.json({ error: "Not found" }, 404);
  }

  // Track config fetch — updates lastActiveAt for admin visibility
  db.update(users)
    .set({ lastActiveAt: new Date().toISOString() })
    .where(eq(users.id, user.id))
    .catch(() => {});  // fire-and-forget, don't block response

  let singboxConfig: any = null;

  // 1. Try fetching Marzban sing-box config
  if (user.marzbanSubUrl && config.marzbanApiUrl) {
    try {
      // Extract sub token from URL (e.g. https://cdn.example.com/sub/TOKEN or /r/TOKEN)
      const subToken = user.marzbanSubUrl.replace(/^.*\/(sub|r)\//, "");
      const marzbanInternalUrl = `${config.marzbanApiUrl}/sub/${subToken}`;

      const res = await fetch(marzbanInternalUrl, {
        headers: { "User-Agent": "SFI/1.0" },
        // @ts-ignore — undici dispatcher for self-signed cert
        dispatcher: tlsSkipAgent,
      });

      if (res.ok) {
        singboxConfig = await res.json();
      }
    } catch (err) {
      console.error("[singbox-unified] Failed to fetch Marzban sub:", err);
    }
  }

  // 2. If no Marzban config, build a minimal sing-box config
  if (!singboxConfig) {
    singboxConfig = {
      log: { level: "warn" },
      dns: {
        servers: [
          { tag: "dns-remote", address: "https://1.1.1.1/dns-query", detour: "proxy" },
          { tag: "dns-local", address: "local", detour: "direct" },
        ],
        rules: [{ outbound: "any", server: "dns-local" }],
        final: "dns-remote",
        strategy: "prefer_ipv4",
      },
      inbounds: [
        {
          type: "tun",
          tag: "tun-in",
          interface_name: "tun0",
          inet4_address: "172.19.0.1/30",
          auto_route: true,
        },
      ],
      outbounds: [
        { type: "selector", tag: "proxy", outbounds: ["direct"] },
        { type: "direct", tag: "direct" },
      ],
      route: {
        rules: [
          { action: "sniff" },
          { protocol: "dns", action: "hijack-dns" },
          { ip_is_private: true, outbound: "direct" },
        ],
        final: "proxy",
        auto_detect_interface: true,
        override_android_vpn: true,
      },
      experimental: { cache_file: { enabled: true, store_rdrc: true } },
    };
  }

  // 2b. Migrate legacy special outbounds (block, dns) to route actions
  migrateLegacyOutbounds(singboxConfig);

  // 2b2. Inject strict_route into TUN inbound if admin enabled it.
  // DISABLED: strict_route (includeAllNetworks on iOS) causes ShadowTLS v3 outbound
  // connections to loop through the TUN on SFI 1.11.4, creating a routing loop → EOF.
  // Re-enable once SFI properly handles ShadowTLS with includeAllNetworks.
  // if (getBoolean("feature.strictRoute")) {
  //   const tunInbound = singboxConfig.inbounds?.find((i: any) => i.type === "tun");
  //   if (tunInbound) {
  //     tunInbound.strict_route = true;
  //   }
  // }

  // 2c. Inject HU-CDN as a second WebSocket path for transport diversity.
  // sing-box's httpupgrade transport can't work through Cloudflare (h2 strips upgrade headers),
  // so we use ws transport on CDN_HU_PATH. Caddy rewrites it to CDN_WS_PATH and proxies to
  // the same Xray WS inbound. Different path = different DPI fingerprint, same backend.
  // Remove any Marzban-provided httpupgrade outbounds first — they won't work through CF.
  {
    singboxConfig.outbounds = singboxConfig.outbounds.filter(
      (o: any) => o.transport?.type !== "httpupgrade"
    );
    const hasHuCdn = singboxConfig.outbounds?.some(
      (o: any) => o.tag?.startsWith("HU-CDN"),
    );
    if (!hasHuCdn) {
      const existingVless = singboxConfig.outbounds?.find((o: any) => o.type === "vless" && o.uuid);
      if (existingVless && config.cdnCleanDomain) {
        // The clean-domain rewrite later in the pipeline handles CDN_SOURCE_DOMAIN → CDN_CLEAN_DOMAIN.
        singboxConfig.outbounds.push({
          type: "vless",
          tag: "HU-CDN (" + (user.marzbanUsername || "user") + ")",
          server: config.cdnCleanDomain,
          server_port: 443,
          uuid: existingVless.uuid,
          tls: {
            enabled: true,
            server_name: config.cdnCleanDomain,
            utls: { enabled: true, fingerprint: "chrome" },
          },
          transport: {
            type: "ws",
            path: config.cdnHuPath,
            headers: { "Host": config.cdnCleanDomain },
          },
        });
      }
    }
  }

  // 3. Inject sing-box outbounds (ShadowTLS, Hysteria2, TUIC, Trojan)
  if (singbox) {
    const extraOutbounds = singbox.buildOutbounds({
      shadowTlsPassword: user.shadowTlsPassword,
      shadowTlsSsPassword: user.shadowTlsSsPassword,
      hysteria2Password: user.hysteria2Password,
      tuicUuid: user.tuicUuid,
      tuicPassword: user.tuicPassword,
      trojanPassword: user.trojanPassword,
    });

    if (extraOutbounds.length > 0) {
      singboxConfig.outbounds.push(...extraOutbounds);

      // Transport detours (like ShadowTLS-transport) are internal — don't expose in selector
    }
  }

  // Remove Marzban's urltest outbounds — we'll build our own with better settings
  singboxConfig.outbounds = singboxConfig.outbounds.filter((o: any) => o.type !== "urltest");

  // === CLEAN DOMAIN MIGRATION ===
  // Rewrite the CDN host Marzban emits (CDN_SOURCE_DOMAIN) to the domain clients should use
  // (CDN_CLEAN_DOMAIN). Lets you move off a DNS-poisoned domain without touching Marzban.
  // Domain-based resolution lets the CDN return edge IPs that work for the user's region.
  const CDN_DOMAIN = config.cdnSourceDomain;
  const CLEAN_DOMAIN = config.cdnCleanDomain;
  if (CDN_DOMAIN && CLEAN_DOMAIN && CDN_DOMAIN !== CLEAN_DOMAIN) for (const outbound of singboxConfig.outbounds) {
    if (outbound.server === CDN_DOMAIN) {
      outbound.server = CLEAN_DOMAIN;
    }
    if (outbound.tls?.server_name === CDN_DOMAIN) {
      outbound.tls.server_name = CLEAN_DOMAIN;
    }
    if (outbound.transport?.headers?.Host === CDN_DOMAIN) {
      outbound.transport.headers.Host = CLEAN_DOMAIN;
    }
    if (outbound.transport?.headers?.host === CDN_DOMAIN) {
      outbound.transport.headers.host = CLEAN_DOMAIN;
    }
  }

  // === BACKUP CDN DOMAIN ===
  // Domain diversity: if the clean domain gets flagged, urltest falls back to the backup
  // domain. Use a different domain in a different CDN zone, same backend.
  const BACKUP_CDN_DOMAIN = config.cdnBackupDomain;
  if (BACKUP_CDN_DOMAIN && CLEAN_DOMAIN) {
    const cdnOutbounds = singboxConfig.outbounds.filter((o: any) =>
      o.type === "vless" && o.tls?.server_name === CLEAN_DOMAIN
    );
    for (const orig of cdnOutbounds) {
      const backup = JSON.parse(JSON.stringify(orig));
      backup.tag = backup.tag.replace(/^(WS|HU|gRPC)-CDN/, "$1-CDN2");
      backup.server = BACKUP_CDN_DOMAIN;
      backup.tls.server_name = BACKUP_CDN_DOMAIN;
      if (backup.transport?.headers?.Host) backup.transport.headers.Host = BACKUP_CDN_DOMAIN;
      if (backup.transport?.headers?.host) backup.transport.headers.host = BACKUP_CDN_DOMAIN;
      singboxConfig.outbounds.push(backup);
    }
  }

  // === CLOUDFLARE IP OVERRIDE CDN OUTBOUNDS ===
  // Some Iranian ISPs block the Cloudflare IP range that the clean domain resolves to
  // (e.g. 188.114.98.x/99.x). By creating duplicates with hardcoded IPs from different
  // CF /16 ranges, the urltest auto-finds one that works on each user's ISP. The domain
  // stays in SNI/Host headers so Cloudflare routes to our origin correctly.
  // IPs sourced from compassvpn/cf-tools all_cdn_v4.txt (verified CDN /24 subnets).
  const CF_IP_OVERRIDES = [
    { ip: "104.18.0.2", label: "104.18" },
    { ip: "172.66.0.2", label: "172.66" },
    { ip: "141.101.113.2", label: "141" },
    { ip: "162.159.0.2", label: "162" },
    { ip: "198.41.192.2", label: "198" },
    { ip: "108.162.192.2", label: "108" },
    { ip: "190.93.244.2", label: "190" },
    { ip: "173.245.49.2", label: "173" },
  ];
  {
    // Use the first WS-CDN outbound on the clean domain as the template
    const wsCdn = singboxConfig.outbounds.find((o: any) =>
      o.type === "vless" && o.tag?.startsWith("WS-CDN") && o.tls?.server_name === CLEAN_DOMAIN
    );
    if (wsCdn) {
      for (const range of CF_IP_OVERRIDES) {
        const ipOutbound = JSON.parse(JSON.stringify(wsCdn));
        ipOutbound.tag = ipOutbound.tag.replace(/^WS-CDN/, `CF${range.label}`);
        ipOutbound.server = range.ip;
        // SNI and Host headers stay as the domain — Cloudflare needs them to route
        singboxConfig.outbounds.push(ipOutbound);
      }
    }
  }

  // === CLOUDFLARE WORKER RELAY ===
  // Worker on workers.dev domain — may resolve to different CF edge IPs than
  // regular proxied domains. Bypasses IP-range blocking in Iran.
  const WORKER_DOMAIN = config.workerRelayDomain;
  if (WORKER_DOMAIN && CLEAN_DOMAIN) {
    const wsCdn = singboxConfig.outbounds.find((o: any) =>
      o.type === "vless" && o.tag?.startsWith("WS-CDN") && o.tls?.server_name === CLEAN_DOMAIN
    );
    if (wsCdn) {
      for (const [tag, path] of [["WS-Worker", config.cdnWsPath], ["HU-Worker", config.cdnHuPath]] as const) {
        const w = JSON.parse(JSON.stringify(wsCdn));
        w.tag = `${tag} (${(w.tag.match(/\((.+)\)/) || ["", "user"])[1]})`;
        w.server = WORKER_DOMAIN;
        w.tls.server_name = WORKER_DOMAIN;
        if (w.transport?.headers?.Host) w.transport.headers.Host = WORKER_DOMAIN;
        if (w.transport?.headers?.host) w.transport.headers.host = WORKER_DOMAIN;
        w.transport.path = path;
        singboxConfig.outbounds.push(w);
      }
    }
  }

  // === REPLACE ORIGIN HOST WITH RAW IP ===
  // Don't expose the origin/admin hostname in configs. Direct protocols (ShadowTLS, Trojan,
  // Hysteria2, TUIC) use DIRECT_TLS_DOMAIN as TLS server_name (cert via DNS-01, no A record).
  if (config.originHost && config.publicServerIp) {
    for (const outbound of singboxConfig.outbounds) {
      if (outbound.server === config.originHost) {
        outbound.server = config.publicServerIp;
      }
    }
  }

  // Fix DNS for censored networks (Iran):
  // dns-local resolves proxy server addresses before tunnel is up. Must use system DNS
  // ("local") — foreign DNS servers (8.8.8.8, 1.0.0.1) are blocked on ALL ports by Iranian ISPs.
  // System/ISP DNS reliably resolves clean CDN domains to Cloudflare edge IPs.
  // dns-remote handles app traffic DNS through the proxy tunnel once connected.
  // Uses legacy DNS format for compatibility with SFI 1.11.x (iOS App Store latest).
  if (singboxConfig.dns) {
    const servers = singboxConfig.dns.servers || [];

    const localIdx = servers.findIndex((s: any) => s.tag === "dns-local");
    if (localIdx >= 0) {
      servers[localIdx] = {
        tag: "dns-local",
        address: "local",
        detour: "direct",
      };
    } else {
      servers.push({
        tag: "dns-direct",
        address: "local",
        detour: "direct",
      });
      const rules = singboxConfig.dns.rules || [];
      if (!rules.some((r: any) => r.outbound === "any")) {
        rules.unshift({ outbound: "any", server: "dns-direct" });
        singboxConfig.dns.rules = rules;
      }
    }

    const remoteIdx = servers.findIndex((s: any) => s.tag === "dns-remote");
    if (remoteIdx >= 0) {
      // Use DoH (HTTPS) instead of plain UDP for dns-remote.
      // ShadowTLS+SS is TCP-only — plain UDP DNS through it fails with "invalid argument"
      // on SFI 1.11.4 because the UDP association can't be created through the TCP transport.
      servers[remoteIdx] = {
        tag: "dns-remote",
        address: "https://1.1.1.1/dns-query",
        detour: "proxy",
      };
    }
  }

  // Force IPv4 for DNS resolution — the Hetzner server has no IPv6, so when sing-box
  // resolves a destination to an AAAA record and tries to connect via IPv6, it fails with
  // "network is unreachable", dropping the user's connection (visible in sing-box server logs).
  if (singboxConfig.dns) {
    singboxConfig.dns.strategy = "prefer_ipv4";
  }

  // Build proxy selector with all usable outbounds (exclude transport detours and meta outbounds).
  // Default to Reality (direct connection) — CDN paths depend on DNS resolution to Cloudflare
  // IPs, and some Iranian ISPs block entire CF IP ranges, causing total connection failure
  // when auto (CDN-only urltest) is the default. Reality bypasses Cloudflare entirely.
  const selector = singboxConfig.outbounds.find((o: any) => o.type === "selector" && o.tag === "proxy");
  if (selector) {
    const excludeTags = new Set(["proxy", "direct"]);
    const usableOutbounds = singboxConfig.outbounds
      .filter((o: any) =>
        o.type !== "selector" && o.type !== "direct" &&
        !o.tag.endsWith("-transport") && !excludeTags.has(o.tag))
      .map((o: any) => o.tag);
    // Sort: Reality first (most reliable direct), then CDN outbounds, then other direct protocols
    const isReality = (tag: string) => tag.includes("Reality");
    const isCdn = (tag: string) => tag.includes("-CDN") || tag.includes("-CF") || tag.includes("-HEL");
    usableOutbounds.sort((a: string, b: string) => {
      if (isReality(a) && !isReality(b)) return -1;
      if (!isReality(a) && isReality(b)) return 1;
      if (isCdn(a) && !isCdn(b)) return -1;
      if (!isCdn(a) && isCdn(b)) return 1;
      return 0;
    });
    // Add urltest outbound — auto-pings CDN outbounds only so users see latency
    // without tapping the test button. Direct-IP outbounds (Reality, ShadowTLS, etc.)
    // are EXCLUDED: periodic probes to a fixed foreign IP create a DPI-detectable
    // fingerprint that risks getting the server IP blocked for all users.
    // CDN probes go through Cloudflare and look like normal HTTPS — safe.
    const cdnOutbounds = usableOutbounds.filter((tag: string) =>
      tag.includes("-CDN") || tag.includes("-CF")
    );
    const urltestOutbound = {
      type: "urltest",
      tag: "auto (CDN)",
      outbounds: cdnOutbounds.length > 0 ? cdnOutbounds : [...usableOutbounds],
      url: "https://www.gstatic.com/generate_204",
      interval: "10m",
      tolerance: 50,
    };
    singboxConfig.outbounds.push(urltestOutbound);

    // Selector: auto (CDN) as default — urltest picks fastest working CDN outbound.
    // Reality and direct protocols listed after for manual override.
    const selectorOutbounds = ["auto (CDN)", ...usableOutbounds];
    selector.outbounds = selectorOutbounds;
    selector.default = "auto (CDN)";
    selector.interrupt_exist_connections = true;
  }


  // === TLS FRAGMENT (anti-DPI) ===
  // Only inject fragment fields for clients that support them (Hiddify).
  // Official sing-box iOS/Android (SFI/SFA) does NOT support "fragment" yet
  // and will error with "unknown field". Check User-Agent to decide.
  const ua = (c.req.header("User-Agent") || "").toLowerCase();
  const supportsFragment = ua.includes("hiddify");
  if (supportsFragment) {
    const UDP_TYPES = new Set(["hysteria2", "tuic"]);
    for (const outbound of singboxConfig.outbounds) {
      if (outbound.tls?.enabled && !UDP_TYPES.has(outbound.type)) {
        outbound.tls.fragment = true;
        outbound.tls.record_fragment = true;
      }
    }
  }
  c.header("Content-Type", "application/json");
  c.header("Content-Disposition", `attachment; filename="${user.marzbanUsername || "shadowshare"}.json"`);
  c.header("profile-update-interval", "12");
  return c.body(JSON.stringify(singboxConfig, null, 2));
});

/**
 * GET /api/web/hiddify — Hiddify-specific subscription.
 * Returns base64-encoded URI list with protocols only Hiddify supports:
 * VLESS (from Marzban), ShadowTLS+SS, Trojan, Hysteria2, NaiveProxy, SSH, Mieru.
 * Token in query param so Hiddify can fetch it directly.
 */
app.get("/hiddify", async (c) => {
  const token = c.req.query("token");
  if (!token || token.length !== 64) {
    return c.json({ error: "Invalid token" }, 401);
  }

  const user = await db.query.users.findFirst({
    where: eq(users.webToken, token),
  });

  if (!user || !user.isActive) {
    return c.json({ error: "Not found" }, 404);
  }

  // Track config fetch
  db.update(users)
    .set({ lastActiveAt: new Date().toISOString() })
    .where(eq(users.id, user.id))
    .catch(() => {});

  const uris: string[] = [];

  // 1. Fetch Marzban V2Ray subscription (base64-encoded URI list)
  if (user.marzbanSubUrl && config.marzbanApiUrl) {
    try {
      const subToken = user.marzbanSubUrl.replace(/^.*\/(sub|r)\//, "");
      const marzbanInternalUrl = `${config.marzbanApiUrl}/sub/${subToken}`;

      const res = await fetch(marzbanInternalUrl, {
        headers: { "User-Agent": "Hiddify/1.0" },
        // @ts-ignore — undici dispatcher for self-signed cert
        dispatcher: tlsSkipAgent,
      });

      if (res.ok) {
        const b64 = await res.text();
        const decoded = Buffer.from(b64.trim(), "base64").toString("utf-8");
        const marzbanUris = decoded.split("\n").filter((u) => u.trim());

        // Apply domain migration and TLS fragment
        const CDN_DOMAIN = config.cdnSourceDomain;
        const CLEAN_DOMAIN = config.cdnCleanDomain;
        for (let uri of marzbanUris) {
          if (CDN_DOMAIN && CLEAN_DOMAIN) uri = uri.replaceAll(CDN_DOMAIN, CLEAN_DOMAIN);
          uris.push(uri);
        }
      }
    } catch (err) {
      console.error("[hiddify-sub] Failed to fetch Marzban sub:", err);
    }
  }

  // 2. ShadowTLS+SS — SKIPPED in URI list format.
  // No standard ShadowTLS URI scheme exists. The ss:// format can't represent the
  // ShadowTLS wrapper (detour chain). Users get ShadowTLS via sing-box JSON sub instead.

  // 3. Trojan — use raw IP (don't expose the origin hostname)
  if (singbox && user.trojanPassword && config.trojanPort > 0) {
    const trojanPort = config.sniRouterPort || config.trojanPort;
    const trojanDomain = config.directTlsDomain || config.shadowTlsDomain;
    const DIRECT_IP = config.publicServerIp || config.shadowTlsDomain;
    if (trojanDomain && DIRECT_IP) {
      const trojanUri = `trojan://${user.trojanPassword}@${DIRECT_IP}:${trojanPort}?security=tls&sni=${trojanDomain}&fp=chrome&type=tcp#ShadowShare-Trojan`;
      uris.push(trojanUri);
    }
  }

  // 4. Hysteria2 — use raw IP
  if (user.hysteria2Password && config.hysteria2Port > 0) {
    const hy2Domain = config.directTlsDomain || config.shadowTlsDomain;
    const DIRECT_IP = config.publicServerIp || config.shadowTlsDomain;
    if (hy2Domain && DIRECT_IP) {
      const hy2Uri = `hysteria2://${user.hysteria2Password}@${DIRECT_IP}:${config.hysteria2Port}?sni=${hy2Domain}#ShadowShare-Hysteria2`;
      uris.push(hy2Uri);
    }
  }

  // 5. NaiveProxy TLS
  if (naiveProxy && user.naiveUsername && user.naivePassword && getBoolean("feature.naiveProxy")) {
    uris.push(naiveProxy.buildUri(user.naiveUsername, user.naivePassword));
  }

  // 6. NaiveProxy QUIC
  if (naiveProxy && user.naiveUsername && user.naivePassword && getBoolean("feature.naiveProxyQuic") && config.naiveProxyQuicDomain) {
    uris.push(naiveProxy.buildQuicUri(user.naiveUsername, user.naivePassword, config.naiveProxyQuicDomain, config.naiveProxyQuicPort));
  }

  // 7. SSH Tunnel
  if (sshTunnel && user.sshPrivateKey && getBoolean("feature.sshTunnel")) {
    uris.push(sshTunnel.buildUri(user.sshPrivateKey));
  }

  // 8. Mieru TCP + UDP
  if (mieru && user.mieruUsername && user.mieruPassword && getBoolean("feature.mieru")) {
    uris.push(...mieru.buildUris(user.mieruUsername, user.mieruPassword));
  }

  // Encode as base64
  const joined = uris.join("\n");
  const encoded = Buffer.from(joined, "utf-8").toString("base64");

  c.header("Content-Type", "text/plain; charset=utf-8");
  c.header("Content-Disposition", `attachment; filename="${user.marzbanUsername || "shadowshare"}.txt"`);
  c.header("profile-update-interval", "12");
  c.header("Cache-Control", "no-store");
  return c.body(encoded);
});

/**
 * GET /api/web/masterdns-config — download pre-filled MasterDnsVPN client config.
 * Token in query param for easy download links.
 */
app.get("/masterdns-config", async (c) => {
  const token = c.req.query("token");
  if (!token || token.length !== 64) {
    return c.json({ error: "Invalid token" }, 401);
  }

  const user = await db.query.users.findFirst({
    where: eq(users.webToken, token),
  });

  if (!user || !user.isActive) {
    return c.json({ error: "Not found" }, 404);
  }

  if (!getBoolean("feature.masterDnsTunnel") || !config.masterDnsEncryptionKey || !config.dnsttTunnelDomain) {
    return c.json({ error: "Feature not available" }, 404);
  }

  const domain = `${config.masterDnsSubdomain}.${config.dnsttTunnelDomain}`;

  // Get scanned DNS resolvers for the resolver file
  const scannedResolvers = await getTopResolvers(50);
  const resolverIps = scannedResolvers.length > 0
    ? scannedResolvers.map((r) => r.ip)
    : ["8.8.8.8", "1.1.1.1"];

  const toml = `# MasterDnsVPN Client Config — Generated by ShadowShare
# Place client_resolvers.txt in the same folder as this file.
# Then run: ./masterdnsvpn-client -config client_config.toml

DOMAINS = ["${domain}"]
DATA_ENCRYPTION_METHOD = 5
ENCRYPTION_KEY = "${config.masterDnsEncryptionKey}"
PROTOCOL_TYPE = "SOCKS5"
LISTEN_IP = "127.0.0.1"
LISTEN_PORT = 18000
PACKET_DUPLICATION_COUNT = 2
SETUP_PACKET_DUPLICATION_COUNT = 2
RESOLVER_BALANCING_STRATEGY = 0
UPLOAD_COMPRESSION_TYPE = 1
DOWNLOAD_COMPRESSION_TYPE = 1
LOG_LEVEL = "INFO"
`;

  const resolvers = `# DNS Resolvers for MasterDnsVPN
# One resolver per line. These are the DNS servers the client
# sends tunnel queries through to reach the tunnel server.
${resolverIps.join("\n")}
`;

  // Build a zip archive (DEFLATE) with both files.
  // Minimal ZIP writer — local file headers + central directory + EOCD.
  const files = [
    { name: "client_config.toml", data: Buffer.from(toml, "utf-8") },
    { name: "client_resolvers.txt", data: Buffer.from(resolvers, "utf-8") },
  ];

  const localParts: Buffer[] = [];
  const centralParts: Buffer[] = [];
  let offset = 0;
  // DOS-format modification time/date (fixed to arbitrary value — clients don't rely on it).
  const dosTime = 0;
  const dosDate = ((2026 - 1980) << 9) | (1 << 5) | 1;

  for (const file of files) {
    const nameBuf = Buffer.from(file.name, "utf-8");
    const uncompressed = file.data;
    const compressed = deflateRawSync(uncompressed);
    const crc = crc32(uncompressed);

    // Local file header (30 bytes + filename)
    const lfh = Buffer.alloc(30);
    lfh.writeUInt32LE(0x04034b50, 0);  // signature
    lfh.writeUInt16LE(20, 4);          // version needed
    lfh.writeUInt16LE(0x0800, 6);      // flags (bit 11 = UTF-8 names)
    lfh.writeUInt16LE(8, 8);           // method = DEFLATE
    lfh.writeUInt16LE(dosTime, 10);
    lfh.writeUInt16LE(dosDate, 12);
    lfh.writeUInt32LE(crc, 14);
    lfh.writeUInt32LE(compressed.length, 18);
    lfh.writeUInt32LE(uncompressed.length, 22);
    lfh.writeUInt16LE(nameBuf.length, 26);
    lfh.writeUInt16LE(0, 28);          // extra length

    localParts.push(lfh, nameBuf, compressed);

    // Central directory entry (46 bytes + filename)
    const cd = Buffer.alloc(46);
    cd.writeUInt32LE(0x02014b50, 0);   // signature
    cd.writeUInt16LE(20, 4);           // version made by
    cd.writeUInt16LE(20, 6);           // version needed
    cd.writeUInt16LE(0x0800, 8);       // flags
    cd.writeUInt16LE(8, 10);           // method
    cd.writeUInt16LE(dosTime, 12);
    cd.writeUInt16LE(dosDate, 14);
    cd.writeUInt32LE(crc, 16);
    cd.writeUInt32LE(compressed.length, 20);
    cd.writeUInt32LE(uncompressed.length, 24);
    cd.writeUInt16LE(nameBuf.length, 28);
    cd.writeUInt16LE(0, 30);           // extra length
    cd.writeUInt16LE(0, 32);           // comment length
    cd.writeUInt16LE(0, 34);           // disk number
    cd.writeUInt16LE(0, 36);           // internal attrs
    cd.writeUInt32LE(0, 38);           // external attrs
    cd.writeUInt32LE(offset, 42);      // local header offset

    centralParts.push(cd, nameBuf);
    offset += lfh.length + nameBuf.length + compressed.length;
  }

  const centralDir = Buffer.concat(centralParts);
  const localSection = Buffer.concat(localParts);

  // End of central directory record
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(0, 4);                      // disk
  eocd.writeUInt16LE(0, 6);                      // disk with CD
  eocd.writeUInt16LE(files.length, 8);           // entries on disk
  eocd.writeUInt16LE(files.length, 10);          // total entries
  eocd.writeUInt32LE(centralDir.length, 12);     // CD size
  eocd.writeUInt32LE(localSection.length, 16);   // CD offset
  eocd.writeUInt16LE(0, 20);                     // comment length

  const zip = Buffer.concat([localSection, centralDir, eocd]);

  c.header("Content-Type", "application/zip");
  c.header("Content-Disposition", 'attachment; filename="masterdns-config.zip"');
  c.header("Cache-Control", "no-store");
  return c.body(zip);
});

export { app as webRoutes };
