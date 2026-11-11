# Deploying ShadowShare

This guide covers a single-server deploy with Docker Compose behind Cloudflare. Start with the core (web app, Marzban/VLESS over CDN, Reality), confirm it works, and only then turn on extra protocols.

## 1. What you need

- A VPS (2 vCPU / 4 GB is plenty) with Docker and the Compose plugin; ports 80, 443 and 8443 open (plus any UDP ports for the protocols you enable)
- A domain on Cloudflare, ideally **two zones**: one for the origin/admin host and one or two "clean" zones used only for CDN traffic
- Optional: a Telegram bot token from @BotFather

## 2. DNS

| Record | Type | Proxy | Purpose |
|---|---|---|---|
| `ORIGIN_HOST` (e.g. `origin.example.net`) | A → server IP | DNS only | Admin panel, API, subscriptions on :8443; Worker relay origin on :80 |
| `CDN_CLEAN_DOMAIN` (e.g. `go.example.org`) | A → server IP | **Proxied** | Web app, invite links, CDN transports |
| `CDN_BACKUP_DOMAIN` (optional, other zone) | A → server IP | **Proxied** | Duplicate CDN outbounds |
| `DIRECT_TLS_DOMAIN` (optional) | none | — | Cert-only name for Trojan/Hysteria2/TUIC (issued by DNS-01) |

Keep the clean domains clean. Never point an unproxied record at your server from a clean zone, and don't put direct-IP protocols on them. Censors correlate direct VPN IPs with CDN domains in the same zone.

Cloudflare settings for the CDN zones: SSL/TLS **Flexible**, WebSockets **on**, gRPC **on**.

## 3. Configuration files

```bash
./setup.sh
```

This creates `.env`, `.env.marzban`, `Caddyfile` and `marzban-data/xray_config.json` from the examples. It fills in everything that should be random and unique to your server: secrets and passwords, transport paths (in `.env`, the Xray config and the Worker relay), Reality keys and short IDs, AmneziaWG obfuscation, the MTProto secret, a decoy landing page and Marzban's self-signed API cert. It never overwrites a value you've already set, so you can re-run it safely. When it finishes, it lists what you still need to fill in.

### `.env`

Required, and not set by `setup.sh`: `PUBLIC_SERVER_IP`, `ORIGIN_HOST`, `CDN_SOURCE_DOMAIN`, `CDN_CLEAN_DOMAIN`, and `MARZBAN_SUB_URL_BASE`. Everything else is optional; each protocol activates only when its variables are set. `.env.example` documents every variable.

`CDN_SOURCE_DOMAIN` is the host Marzban writes into configs. If it differs from `CDN_CLEAN_DOMAIN`, the subscription pipeline rewrites it. Setting both to the same value is fine.

### Choose your own fingerprint

Public defaults are the first thing a censor blocks. `setup.sh` randomizes the paths, keys, AmneziaWG parameters and decoy page. These are still yours to choose:

- **Reality cover sites**: `REALITY_SNI` and `XHTTP_REALITY_SNI`. Pick real TLS 1.3 sites that are reachable (not blocked) in your users' region. Put the same value in `realitySettings.serverNames` and `dest` in `marzban-data/xray_config.json`; a mismatch is detectable.
- **ShadowTLS handshake server**: `SHADOWTLS_HANDSHAKE_SERVER`.
- **MTProto FakeTLS domain**: `MTPROTO_FAKETLS_DOMAIN`. If you change it, clear `MTPROTO_SECRET` and re-run `setup.sh`, because the domain is encoded in the secret.

If you change a path by hand, change it in all three places: `.env`, `xray_config.json` (gRPC `serviceName` = the path without the leading `/`) and `worker-relay/wrangler.toml`.

**The decoy page** is what anyone sees when they open your CDN domain in a browser. `scripts/gen-decoy.sh` makes a new random one. You can also write your own `static/index.html`, as long as it doesn't look like anyone else's.

### `Caddyfile`

The template reads its hosts, SNIs and paths from the environment. **Delete any site block whose variable you left empty** (for example `{$CDN_BACKUP_DOMAIN}:80` or `{$NAIVE_PROXY_DOMAIN}:2083`), and the matching `layer4` routes for protocols you don't run. An empty host turns into a catch-all and will collide with the others.

## 4. Start

```bash
docker compose up -d --build
docker compose ps
docker compose logs -f shadowshare
```

sing-box may restart a few times on first boot until Caddy has issued the DNS-01 certificate. Once it has, run `docker compose up -d --force-recreate singbox`.

## 5. First login and first invite

1. Open `https://ORIGIN_HOST:8443/` and sign in with `ADMIN_PASSWORD`.
2. **Settings**: set `web.appDomain` to `https://CDN_CLEAN_DOMAIN/app`, then optionally `web.communityLink` and `web.supportContact`. Enable the protocols you configured under `feature.*`.
3. **Invites**: create an invite and open the link on your phone. Pick sing-box or Hiddify, import, and connect.
4. Check the subscription: `https://CDN_CLEAN_DOMAIN/api/web/singbox?token=...` should list your CDN, Reality and any other enabled outbounds.

Set `feature.registrationOpen` to false at any time to stop new sign-ups while keeping existing users.

## 6. Optional components

| Component | Enable with | Notes |
|---|---|---|
| Telegram bot | `BOT_TOKEN`, `BOT_USERNAME`, setting `service.bot` | Mirrors the web flow |
| ShadowTLS / Trojan / Hysteria2 / TUIC | `SHADOWTLS_*`, `*_PORT`, `DIRECT_TLS_DOMAIN`, `SNI_ROUTER_PORT=443` | Needs `CLOUDFLARE_DNS_API_TOKEN` for DNS-01 |
| Worker relay | deploy `worker-relay/` with `ORIGIN_HOST` and `ALLOWED_PATHS` vars; set `WORKER_RELAY_DOMAIN` | `workers.dev` edge IPs differ from proxied-domain IPs |
| CDN decoy worker | deploy `worker/` with `ORIGIN_URL` and `CDN_HOST` | Optional pass-through |
| AmneziaWG | `AWG_SERVER_IP` and obfuscation vars | Userspace, no kernel module |
| OpenVPN + Cloak | `OPENVPN_CLOAK_ENABLED=true`, run `scripts/init-openvpn-cloak.sh <server-ip>` | |
| DNS tunnels | `DNSTT_TUNNEL_DOMAIN`, NS records for the tunnel subdomains, `feature.dnstt` | Last resort; UDP 53 |
| NPV Tunnel (SSH) | `NPV_SSH_HOST`, `DNSTT_SSH_PASSWORD`, `feature.npvTunnel` | Shared credentials |
| MTProto proxy | `MTPROTO_SECRET` (see `.env.example`), `feature.mtprotoProxy` | FakeTLS domain must match the Caddy L4 route |

## 7. Operating

- **Backups**: `data/` holds the SQLite DB and generated configs; `marzban-data/` holds Marzban's DB and Xray config. Back up both.
- **Updates**: `git pull && docker compose build shadowshare && docker compose up -d shadowshare`. Migrations run on start.
- **Config sync**: after any user change, ShadowShare rewrites the sing-box and AmneziaWG configs from the database and reloads those containers.
- **Accepted risks**: VPN credentials are stored in plaintext in SQLite because they have to be delivered to users, and the app container mounts the Docker socket read-only to restart sing-box. Protect the server accordingly.
