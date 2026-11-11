# Contributing

Thanks for helping. Bug fixes, new transports, translations and UX work are all welcome.

## Setup

```bash
npm install
./setup.sh                  # creates .env with generated secrets
npm run db:migrate
npm run dev                 # API :3101, admin :3896
npm run webapp:dev          # web app :5173 (proxies /api)
```

You don't need any VPN backends running to work on the web app or admin panel; providers whose env vars are unset are skipped.

## Before opening a PR

- `npm run build` passes (TypeScript for server and web app, plus the Vite build)
- `npm test` passes (set `SING_BOX_BIN` to a sing-box binary to also run `sing-box check`, as CI does)
- Shell scripts pass `shellcheck -S warning`
- Migrations: change `src/db/schema.ts`, then `npm run db:generate`. Every statement in a migration file must be separated by `--> statement-breakpoint`; CI runs all migrations on a fresh database.
- Never commit real hostnames, IPs, keys, tokens, Telegram links or screenshots with personal data. CI runs gitleaks; please also run it locally (`gitleaks detect --no-git`).
- UI changes: check 375px and desktop widths, and Farsi (RTL). Include before/after screenshots.
- Keep new user-facing strings in all three languages (`webapp/i18n.ts`, `src/i18n/translations.ts`). If you can't translate, add English and say so in the PR.

## Translations

ShadowShare ships in English, Farsi and Finglish. Chinese, Russian, Arabic, Turkish, Burmese and Turkmen would reach people living under heavy censorship today. If you speak one of them, [open a translation issue](https://github.com/arashvakil/shadowshare/issues/new?template=translation.yml) so work isn't duplicated, then:

1. Add the language code to the `Language` type and a full strings object in `webapp/i18n.ts` (web app) and `src/i18n/translations.ts` (bot). Copy `en` and translate every value. TypeScript fails the build if a key is missing.
2. Add it to `isRtl()` in `webapp/i18n.ts` if it's written right to left.
3. Add a button to the language picker in `webapp/screens/onboarding.ts` and the bot's `/language` command (`src/bot/commands/language.ts`).
4. Add it to the `language` enum in `src/db/schema.ts` and run `npm run db:generate`.
5. Search the code for `"pi"` to find the few other places that validate the language list (API, bot middleware, web app state).

Translate for the person on the other end: plain words, short sentences, the way people actually talk. Leave app names, protocol names and `{placeholders}` as they are.

## Code conventions

- Web app: vanilla TypeScript, no framework. Screens in `webapp/screens/`, shared markup in `webapp/components.ts`. The `html` template tag does **not** escape. Wrap any user- or server-supplied value in `escapeAttr()`.
- Providers: `provisionUser()` only generates credentials. The caller inserts them into the DB, **then** calls `syncAfterDbChange()`. Syncing first leaves the new user out of the generated config.
- Config: hosts, IPs and paths come from `src/config.ts` / env. Don't hardcode deployment-specific values.

## License

By contributing you agree your contributions are licensed under AGPL-3.0.
