# Security policy

ShadowShare protects people in hostile networks, so a vulnerability can put users at real risk. Please report privately.

## Reporting

Use GitHub's **private vulnerability reporting** (Security tab → "Report a vulnerability") on this repository. Please don't open a public issue or PR for security problems.

Useful details: affected component and version/commit, steps to reproduce, impact, and whether you think it's being exploited. Expect an acknowledgement within a few days.

## In scope

- Anything that de-anonymizes users or links a user to their traffic or Telegram identity
- Authentication or authorization bypasses (admin panel, web tokens, referral flow)
- Leaking the origin server IP through clean CDN domains or generated client configs
- Injection (XSS, SQL, command) and SSRF
- Protocol or config choices that make traffic trivially fingerprintable

## Out of scope / accepted risks

- VPN credentials are stored in plaintext in SQLite (they must be delivered to clients)
- The sing-box remote-profile token is passed as a query parameter (required by the client; 256-bit entropy)
- The app container mounts the Docker socket read-only (needed to reload sing-box)
- Denial of service through volumetric attacks on your own server

## Operator hardening

- Pick your own transport paths, cover SNIs and AmneziaWG parameters (see `docs/deploy.md`); public defaults are easy to block
- Keep the admin host DNS-only and separate from the CDN zones
- Use a 12+ character `ADMIN_PASSWORD` and set `ADMIN_SESSION_SECRET`
- Back up `data/` and `marzban-data/` somewhere encrypted
