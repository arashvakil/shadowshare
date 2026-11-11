# Changelog

All notable changes to ShadowShare. Versions follow [Semantic Versioning](https://semver.org).

## [1.0.0] - 2026-11-11

First public release.

- Invite-only web app (English, Farsi, Finglish) with one-tap setup for sing-box, Hiddify and AmneziaVPN, invite links and 8-character codes.
- Optional Telegram bot that runs the same flow inside the chat.
- One unified sing-box profile carrying VLESS over CDN (WS, HTTPUpgrade, gRPC, XHTTP), Reality, ShadowTLS v3, Trojan, Hysteria2, TUIC and a Cloudflare Worker relay, with backup-domain and Cloudflare IP-override routes.
- AmneziaWG, OpenVPN + Cloak, SSH and DNS tunnels, and an MTProto proxy for Telegram.
- Admin panel: users, invites, bandwidth, monitoring with block detection, live feature flags and a kill switch.
- `setup.sh` generates every secret, key, transport path and obfuscation value, plus a unique decoy landing page, so no two installs share a fingerprint.
- Pinned upstream images (sing-box, Marzban, mtg). CI validates the generated sing-box server config against the pinned version.
- Prebuilt multi-arch image: `ghcr.io/arashvakil/shadowshare`.
