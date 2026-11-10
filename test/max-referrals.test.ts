// Regression: signups that don't pass maxReferrals (web, bot) ignored the
// bot.maxReferrals admin setting (drizzle's static .default(10) won). They must
// follow the setting, which defaults to MAX_REFERRALS (10). See src/db/defaults.ts.
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomBytes } from "node:crypto";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";

const dir = mkdtempSync(join(tmpdir(), "shadowshare-test-"));
process.env.DATABASE_PATH = join(dir, "test.db");
process.env.TELEGRAM_ID_SALT ||= randomBytes(32).toString("hex");
delete process.env.MAX_REFERRALS;

// Build the DB from the real migrations, so the stale SQL default is present.
const raw = new Database(process.env.DATABASE_PATH);
migrate(drizzle(raw), { migrationsFolder: "./drizzle" });
raw.close();

const { db } = await import("../src/db/index.js");
const { users } = await import("../src/db/schema.js");
const { initSettings, updateSettings } = await import("../src/settings.js");
const { eq } = await import("drizzle-orm");

await initSettings();

async function insertLikeSignup(): Promise<number> {
  const idHash = randomBytes(16).toString("hex");
  await db.insert(users).values({ telegramIdHash: idHash, language: "en" });
  const row = await db.query.users.findFirst({ where: eq(users.telegramIdHash, idHash) });
  return row!.maxReferrals;
}

test("new users get MAX_REFERRALS (10), not the SQL default", async () => {
  assert.equal(await insertLikeSignup(), 10);
});

test("new users follow the bot.maxReferrals admin setting", async () => {
  await updateSettings({ "bot.maxReferrals": "3" });
  assert.equal(await insertLikeSignup(), 3);
});

test.after(() => rmSync(dir, { recursive: true, force: true }));
