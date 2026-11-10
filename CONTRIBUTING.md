# Contributing

Thanks for helping. Bug fixes, new transports, translations and UX work are all welcome.

## Setup

```bash
npm install
cp .env.example .env        # set TELEGRAM_ID_SALT and ADMIN_PASSWORD at minimum
npm run db:migrate
npm run dev                 # API :3101, admin :3896
npm run webapp:dev          # web app :5173 (proxies /api)
```

You don't need any VPN backends running to work on the web app or admin panel; providers whose env vars are unset are skipped.

## Before opening a PR

- `npm run build` passes (TypeScript for server and web app, plus the Vite build)
- `npm test` passes
- Migrations: change `src/db/schema.ts`, then `npm run db:generate`. Every statement in a migration file must be separated by `--> statement-breakpoint`; CI runs all migrations on a fresh database.
- Never commit real hostnames, IPs, keys, tokens, Telegram links or screenshots with personal data. CI runs gitleaks; please also run it locally (`gitleaks detect --no-git`).
- UI changes: check 375px and desktop widths, and Farsi (RTL). Include before/after screenshots.
- Keep new user-facing strings in all three languages (`webapp/i18n.ts`, `src/i18n/translations.ts`). If you can't translate, add English and say so in the PR.

## Code conventions

- Web app: vanilla TypeScript, no framework. Screens in `webapp/screens/`, shared markup in `webapp/components.ts`. The `html` template tag does **not** escape. Wrap any user- or server-supplied value in `escapeAttr()`.
- Providers: `provisionUser()` only generates credentials. The caller inserts them into the DB, **then** calls `syncAfterDbChange()`. Syncing first leaves the new user out of the generated config.
- Config: hosts, IPs and paths come from `src/config.ts` / env. Don't hardcode deployment-specific values.

## License

By contributing you agree your contributions are licensed under AGPL-3.0.
