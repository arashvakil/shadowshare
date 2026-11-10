# ShadowShare

A self-hosted web app (plus optional Telegram bot) that hands out censorship-resistant VPN access through invite chains. One person runs a server and invites a few people they trust; each of them can invite a few more. No public sign-up page, no passwords, no payments.

Built for people in heavily censored networks (Iran, China, Russia and similar), where a public VPN service gets found and blocked quickly.

## How it works

1. An operator deploys ShadowShare on a VPS and shares an invite link.
2. The recipient opens it in a browser, picks a language, and gets VPN profiles immediately.
3. A guided wizard walks them through one client app (sing-box, Hiddify or AmneziaVPN) with 1-tap import links, copy buttons and QR codes.
4. They get their own invite links (10 by default) to pass on.

## Protocols

Censors detect plain WireGuard and OpenVPN easily, so ShadowShare layers several transports and lets clients fail over between them:

| Transport | Path | Notes |
|---|---|---|
| VLESS + WebSocket / gRPC / XHTTP / HTTPUpgrade | via Cloudflare CDN | Looks like ordinary HTTPS to a CDN |
| VLESS + Reality (Vision) and XHTTP + Reality | direct, :443 | Mimics a real TLS site you choose |
| ShadowTLS v3 + Shadowsocks, Trojan | direct, :443 | SNI-multiplexed by Caddy L4 |
| VLESS via Cloudflare Worker relay | `*.workers.dev` | Useful when proxied-domain IP ranges are blocked |
| Hysteria2, TUIC | UDP | Fast where UDP isn't filtered |
| AmneziaWG | UDP | Obfuscated WireGuard |
| OpenVPN + Cloak | :4443 | Classic VPN disguised as HTTPS |
| DNS tunnels (DNSTT, Slipstream, MasterDnsVPN) | UDP :53 | Last resort, slow (~1 Mbps) |
| SSH-direct (NPV Tunnel), MTProto proxy | :2222, :443 | Shared-credential fallbacks; MTProto is Telegram-only |

Every protocol is optional and turns on only when its env vars are set.

## Features

- **Web app at `/app`** (vanilla TypeScript, ~110 KB) in English, Farsi (RTL) and Finglish
- **Optional Telegram bot** (grammY) with the same flow
- **sing-box subscription** with automatic outbound selection, plus V2Ray and AmneziaVPN formats
- **Admin panel**: users, activity tiers, bandwidth, invite codes, feature flags, kill switch
- **Privacy**: Telegram IDs are HMAC-hashed; web tokens are 256-bit; no email or phone collected
- **Docker Compose** for the whole stack

## Architecture

```
Browser / Telegram ─▶ Hono API (:3101) ─▶ provider orchestration ─▶ SQLite (Drizzle)
                      Admin    (:3896)        │
                                              ├─ Marzban / Xray   (VLESS)
                                              ├─ sing-box         (ShadowTLS, Trojan, Hysteria2, TUIC)
                                              ├─ AmneziaWG        (userspace, managed via docker exec)
                                              ├─ OpenVPN + Cloak
                                              └─ dnstm            (DNS tunnels, Dropbear SSH)

Caddy: :80 CDN backends · :443 L4 SNI router · :8443 admin/API/subscriptions
```

## Quick start

You need a VPS with Docker, a domain on Cloudflare (free plan is fine), and about 30 minutes.

```bash
git clone https://github.com/arashvakil/shadowshare.git
cd shadowshare
cp .env.example .env
cp .env.marzban.example .env.marzban
cp Caddyfile.example Caddyfile
mkdir -p marzban-data && cp marzban/xray_config.example.json marzban-data/xray_config.json
# edit .env, .env.marzban and marzban-data/xray_config.json, then:
docker compose up -d
```

[docs/deploy.md](docs/deploy.md) is the full walkthrough: DNS records, Cloudflare settings, Reality keys, choosing cover SNIs and paths, enabling features in the admin panel, and creating the first invite.

**Pick your own values.** Don't reuse the example paths (`/ws`, `/hu`, ...), cover domains or AWG obfuscation parameters as shipped. Censors fingerprint public defaults.

## Client apps

| App | Platform | Uses |
|---|---|---|
| sing-box | iOS, Android | Unified subscription (recommended) |
| Hiddify | iOS, Android | Same subscription, friendlier UI |
| V2rayNG / Streisand | Android / iOS | VLESS variants incl. XHTTP |
| AmneziaVPN | iOS, Android | AmneziaWG, OpenVPN + Cloak |
| SlipNet / HTTP Injector | Android / iOS | DNS tunnel |

## Development

```bash
npm install
npm run dev            # API + bot with hot reload (needs a .env)
npm run webapp:dev     # web app on :5173, proxies /api to :3101
npm run build          # typecheck + build
npm run db:generate    # new Drizzle migration after schema changes
npm run db:migrate     # apply migrations
npm test               # node:test suite in test/
```

See [CONTRIBUTING.md](CONTRIBUTING.md). Security issues: [SECURITY.md](SECURITY.md).

## License

[AGPL-3.0](LICENSE). If you run a modified version as a network service, you must offer its source to your users.
