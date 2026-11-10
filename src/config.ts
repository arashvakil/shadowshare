import "dotenv/config";
import { randomBytes } from "node:crypto";
import { envMaxReferrals } from "./db/defaults.js";

function required(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`Missing required env var: ${key}`);
  return value;
}

function resolveSessionSecret(): string {
  const envSecret = process.env.ADMIN_SESSION_SECRET;
  if (envSecret) return envSecret;
  const generated = randomBytes(32).toString("hex");
  console.warn("[WARN] ADMIN_SESSION_SECRET not set — using auto-generated secret (sessions will not survive restarts)");
  return generated;
}

export const config = {
  botToken: process.env.BOT_TOKEN || "",
  botUsername: process.env.BOT_USERNAME || "",
  adminTelegramIds: (process.env.ADMIN_TELEGRAM_IDS || "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean),
  telegramIdSalt: required("TELEGRAM_ID_SALT"),
  databasePath: process.env.DATABASE_PATH || "./data/shadowshare.db",
  maxReferrals: envMaxReferrals(),
  apiPort: parseInt(process.env.API_PORT || "3101", 10),
  miniAppUrl: process.env.MINI_APP_URL || "",
  adminPassword: process.env.ADMIN_PASSWORD || "",  // validated at startup in server.ts
  adminPort: parseInt(process.env.ADMIN_PORT || "3896", 10),
  adminSessionSecret: resolveSessionSecret(),
  // Marzban (optional — multi-protocol VPN)
  marzbanApiUrl: process.env.MARZBAN_API_URL || "",
  marzbanUsername: process.env.MARZBAN_USERNAME || "",
  marzbanPassword: process.env.MARZBAN_PASSWORD || "",
  marzbanSubUrlBase: process.env.MARZBAN_SUB_URL_BASE || "",
  // AmneziaWG (optional — self-managed, built from source)
  awgServerIp: process.env.AWG_SERVER_IP || "",
  awgListenPort: parseInt(process.env.AWG_LISTEN_PORT || "51820", 10),
  awgServerAddress: process.env.AWG_SERVER_ADDRESS || "10.8.0.1/24",
  awgDns: process.env.AWG_DNS || "1.1.1.1",
  awgMtu: parseInt(process.env.AWG_MTU || "1280", 10),
  awgContainerName: process.env.AWG_CONTAINER_NAME || "shadowshare-amneziawg-1",
  dnstmContainerName: process.env.DNSTM_CONTAINER_NAME || "shadowshare-dnstm-1",
  singboxContainerName: process.env.SINGBOX_CONTAINER_NAME || "shadowshare-singbox-1",
  cloakContainerName: process.env.CLOAK_CONTAINER_NAME || "shadowshare-cloak-1",
  mtgContainerName: process.env.MTG_CONTAINER_NAME || "shadowshare-mtg-1",
  // AWG 2.0 shared params (must match on server and client)
  // S1/S2: padding sizes for handshake packets. Constraint: S1+56 must NOT equal S2.
  // S3/S4: MUST be 0 — PR #2289 fix merged to dev but not in any stable release yet (as of 4.8.14.5).
  awgS1: parseInt(process.env.AWG_S1 || "87", 10),
  awgS2: parseInt(process.env.AWG_S2 || "113", 10),
  awgS3: parseInt(process.env.AWG_S3 || "0", 10),
  awgS4: parseInt(process.env.AWG_S4 || "0", 10),
  // H1-H4: dynamic header magic values. Must be in distinct, non-overlapping magnitude ranges
  // to distinguish packet types while evading DPI. amneziawg-go natively supports range syntax
  // (e.g. "100000-800000") — picks a random value per packet for better anti-fingerprinting.
  // Ranges per AWG 2.0 spec: H1: 100000–800000, H2: 1000000–8000000, H3: 10000000–80000000, H4: 100000000–800000000
  awgH1: process.env.AWG_H1 || "100000-800000",
  awgH2: process.env.AWG_H2 || "1000000-8000000",
  awgH3: process.env.AWG_H3 || "10000000-80000000",
  awgH4: process.env.AWG_H4 || "100000000-800000000",
  // AWG 2.0 client-only params — junk packets sent before handshake
  awgJc: parseInt(process.env.AWG_JC || "4", 10),
  awgJmin: parseInt(process.env.AWG_JMIN || "50", 10),
  awgJmax: parseInt(process.env.AWG_JMAX || "1000", 10),
  // AWG 2.0 signature packets (client-only, advanced DPI evasion)
  // Uses tag syntax: <b 0xHEX> specific bytes, <r N> random bytes, <t> timestamp, <c> counter
  awgI1: process.env.AWG_I1 || "",
  awgI2: process.env.AWG_I2 || "",
  awgI3: process.env.AWG_I3 || "",
  awgI4: process.env.AWG_I4 || "",
  awgI5: process.env.AWG_I5 || "",
  // OpenVPN + Cloak (optional — OpenVPN disguised as HTTPS via Cloak)
  serverIp: process.env.SERVER_IP || "",
  cloakPort: parseInt(process.env.CLOAK_PORT || "4443", 10),
  openvpnCloakEnabled: process.env.OPENVPN_CLOAK_ENABLED === "true",
  // NaiveProxy (optional — Chromium-fingerprint HTTPS proxy)
  naiveProxyDomain: process.env.NAIVE_PROXY_DOMAIN || "",
  naiveProxyCaddyAdmin: process.env.NAIVE_PROXY_CADDY_ADMIN || "http://caddy:2019",
  // ShadowTLS v3 + Shadowsocks (optional — sing-box sidecar)
  shadowTlsDomain: process.env.SHADOWTLS_DOMAIN || "",
  shadowTlsPort: parseInt(process.env.SHADOWTLS_PORT || "8444", 10),
  shadowTlsHandshakeServer: process.env.SHADOWTLS_HANDSHAKE_SERVER || "www.notion.so",
  shadowTlsStrictMode: process.env.SHADOWTLS_STRICT_MODE !== "false",
  shadowTlsMethod: process.env.SHADOWTLS_METHOD || "2022-blake3-aes-128-gcm",
  warp: {
    privateKey: process.env.WARP_PRIVATE_KEY || "",
    addressV4: process.env.WARP_ADDRESS_V4 || "",
    addressV6: process.env.WARP_ADDRESS_V6 || "",
    reserved: (process.env.WARP_RESERVED || "").split(",").map((n) => parseInt(n.trim(), 10)).filter((n) => !isNaN(n)),
    peerHost: process.env.WARP_PEER_HOST || "engage.cloudflareclient.com",
    peerPort: parseInt(process.env.WARP_PEER_PORT || "2408", 10),
    peerPublicKey: process.env.WARP_PEER_PUBLIC_KEY || "bmXOC+F1FxEMF9dyiK2H5/1SUtzH0JuVo51h2wPfgyo=",
  },
  // Hysteria2 (optional — QUIC/UDP via sing-box)
  hysteria2Port: parseInt(process.env.HYSTERIA2_PORT || "0", 10),
  // TUIC (optional — QUIC/UDP via sing-box)
  tuicPort: parseInt(process.env.TUIC_PORT || "0", 10),
  // Trojan (optional — TCP+TLS via sing-box)
  trojanPort: parseInt(process.env.TROJAN_PORT || "0", 10),
  // Clean domain for direct protocol TLS (Trojan, Hysteria2, TUIC).
  // Uses DNS-01 challenge cert — no A record, avoids zone contamination.
  directTlsDomain: process.env.DIRECT_TLS_DOMAIN || "",
  // SNI router port — when set, TCP-based direct protocols (ShadowTLS, Trojan) advertise
  // this port to clients instead of their listen ports. Used with caddy-l4 SNI multiplexing
  // where all TCP protocols share port 443 but route internally by SNI.
  sniRouterPort: parseInt(process.env.SNI_ROUTER_PORT || "0", 10),
  // DNS Tunnel (optional — dnstt/Slipstream/NoizDNS via dnstm)
  dnsttTunnelDomain: process.env.DNSTT_TUNNEL_DOMAIN || "",
  dnsttPubkey: process.env.DNSTT_PUBKEY || "",
  dnsttSlipstreamDomain: process.env.DNSTT_SLIPSTREAM_SUBDOMAIN || "t2",
  dnsttDnsttDomain: process.env.DNSTT_DNSTT_SUBDOMAIN || "d2",
  dnsttSshPassword: process.env.DNSTT_SSH_PASSWORD || "",
  dnsttXrayUuid: process.env.DNSTT_XRAY_UUID || "",
  dnsttDnsRelayIp: process.env.DNSTT_DNS_RELAY_IP || "",
  // MasterDnsVPN (optional — advanced DNS tunnel, shared encryption key)
  masterDnsEncryptionKey: process.env.MASTERDNS_ENCRYPTION_KEY || "",
  masterDnsSubdomain: process.env.MASTERDNS_SUBDOMAIN || "m",
  // NPV Tunnel (SSH-Direct via NapsternetV/NpvTunnel)
  // Supports multiple servers: NPV_SSH_HOST, NPV_SSH_HOST_2, etc.
  npvSshHost: process.env.NPV_SSH_HOST || "",
  npvSshPort: parseInt(process.env.NPV_SSH_PORT || "2222", 10),
  npvUdpgwPort: parseInt(process.env.NPV_UDPGW_PORT || "7300", 10),
  npvServers: parseNpvServers(),
  // Mieru (optional — TCP+UDP port-range multiplexing)
  mieruServerIp: process.env.MIERU_SERVER_IP || process.env.AWG_SERVER_IP || "",
  mieruTcpPorts: process.env.MIERU_TCP_PORTS || "17261-17264",
  mieruUdpPorts: process.env.MIERU_UDP_PORTS || "29987-29990",
  mieruContainerName: process.env.MIERU_CONTAINER_NAME || "shadowshare-mieru-1",
  // SSH Tunnel (optional — per-user ed25519 keys)
  sshTunnelHost: process.env.SSH_TUNNEL_HOST || process.env.NPV_SSH_HOST || "",
  sshTunnelPort: parseInt(process.env.SSH_TUNNEL_PORT || "2222", 10),
  sshTunnelUser: process.env.SSH_TUNNEL_USER || "tunnel",
  // NaiveProxy QUIC (optional — QUIC variant for NaiveProxy)
  naiveProxyQuicPort: parseInt(process.env.NAIVE_PROXY_QUIC_PORT || "37423", 10),
  naiveProxyQuicDomain: process.env.NAIVE_PROXY_QUIC_DOMAIN || "",
  // MTProto Proxy (optional — Telegram proxy via mtg)
  mtprotoSecret: process.env.MTPROTO_SECRET || "",
  mtprotoServer: process.env.MTPROTO_SERVER || process.env.AWG_SERVER_IP || "",
  mtprotoFakeTlsDomain: process.env.MTPROTO_FAKETLS_DOMAIN || "cloudflare.com",
  // CDN / relay routing for the sing-box + V2Ray subscription pipeline (all optional).
  // cdnSourceDomain: the CDN host Marzban writes into its configs (rewritten to cdnCleanDomain).
  // cdnCleanDomain: the CDN-fronted domain clients actually connect to.
  // cdnBackupDomain: a second CDN-fronted domain; CDN outbounds are duplicated onto it.
  // workerRelayDomain: a Cloudflare Worker (worker-relay/) hostname, e.g. relay.<acct>.workers.dev.
  // originHost: DNS-only hostname that points at this server; rewritten to publicServerIp in configs.
  cdnSourceDomain: process.env.CDN_SOURCE_DOMAIN || "",
  cdnCleanDomain: process.env.CDN_CLEAN_DOMAIN || process.env.CDN_SOURCE_DOMAIN || "",
  cdnBackupDomain: process.env.CDN_BACKUP_DOMAIN || "",
  workerRelayDomain: process.env.WORKER_RELAY_DOMAIN || "",
  originHost: process.env.ORIGIN_HOST || "",
  publicServerIp: process.env.PUBLIC_SERVER_IP || process.env.AWG_SERVER_IP || "",
  // WebSocket paths behind the CDN (must match Caddyfile + Xray inbounds). Pick your own.
  cdnWsPath: process.env.CDN_WS_PATH || "/ws",
  cdnHuPath: process.env.CDN_HU_PATH || "/hu",
  // Cloudflare API (optional — for Worker analytics in admin dashboard)
  cloudflareApiKey: process.env.CLOUDFLARE_API_KEY || "",
  cloudflareEmail: process.env.CLOUDFLARE_EMAIL || "",
  cloudflareAccountId: process.env.CLOUDFLARE_ACCOUNT_ID || "",
  // Hetzner Cloud API (optional — for billing in admin dashboard)
  hetznerApiToken: process.env.HETZNER_API_TOKEN || "",
  // AWS (optional — for billing in admin dashboard)
} as const;

function parseNpvServers(): Array<{ name: string; sshHost: string; sshPort: number; udpgwPort: number }> {
  const servers: Array<{ name: string; sshHost: string; sshPort: number; udpgwPort: number }> = [];
  // Primary server
  if (process.env.NPV_SSH_HOST) {
    servers.push({
      name: process.env.NPV_SSH_NAME || "Server 1",
      sshHost: process.env.NPV_SSH_HOST,
      sshPort: parseInt(process.env.NPV_SSH_PORT || "2222", 10),
      udpgwPort: parseInt(process.env.NPV_UDPGW_PORT || "7300", 10),
    });
  }
  // Additional servers: NPV_SSH_HOST_2, NPV_SSH_HOST_3, etc.
  for (let i = 2; i <= 10; i++) {
    const host = process.env[`NPV_SSH_HOST_${i}`];
    if (!host) continue;
    servers.push({
      name: process.env[`NPV_SSH_NAME_${i}`] || `Server ${i}`,
      sshHost: host,
      sshPort: parseInt(process.env[`NPV_SSH_PORT_${i}`] || "2222", 10),
      udpgwPort: parseInt(process.env[`NPV_UDPGW_PORT_${i}`] || "7300", 10),
    });
  }
  return servers;
}
