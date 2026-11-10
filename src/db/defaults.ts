// Runtime column defaults that depend on admin settings. This is a leaf module
// with no imports, so schema.ts (also loaded by drizzle-kit, with no .env) can
// use it without pulling in config.ts or settings.ts (settings → db → schema).
// settings.ts registers the live provider when it loads.
//
// Why no `.default()` on users.max_referrals: drizzle applies a static
// `.default()` before `$defaultFn`, so a hardcoded 10 silently overrode the
// `bot.maxReferrals` admin setting for web and bot signups. (The SQL DEFAULT
// left by migration 0002 is 5; it only matters for raw SQL inserts.)

/** MAX_REFERRALS env var, default 10. config.maxReferrals reads this too. */
export function envMaxReferrals(): number {
  const n = parseInt(process.env.MAX_REFERRALS || "10", 10);
  return Number.isInteger(n) && n >= 0 ? n : 10;
}

let maxReferralsProvider: () => number = envMaxReferrals;

export function setMaxReferralsProvider(fn: () => number): void {
  maxReferralsProvider = fn;
}

export function defaultMaxReferrals(): number {
  const n = maxReferralsProvider();
  return Number.isInteger(n) && n >= 0 ? Math.min(n, 10000) : envMaxReferrals();
}
