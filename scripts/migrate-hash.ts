/**
 * One-time migration script: hash existing telegram_id values in-place.
 *
 * Run BEFORE deploying the new code, AFTER applying the Drizzle migration
 * (which renames telegram_id → telegram_id_hash).
 *
 * Usage:
 *   TELEGRAM_ID_SALT=your-secret-salt npx tsx scripts/migrate-hash.ts
 *
 * The script:
 *  1. Reads all users from the DB
 *  2. Hashes each telegram_id_hash value (which still contains the raw ID after column rename)
 *  3. Writes the hashed value back
 *  4. Removes the telegram_username column data (already dropped by migration)
 */

import "dotenv/config";
import Database from "better-sqlite3";
import { createHmac } from "node:crypto";

const DB_PATH = process.env.DATABASE_PATH || "./data/shadowshare.db";
const SALT = process.env.TELEGRAM_ID_SALT;

if (!SALT) {
  console.error("ERROR: TELEGRAM_ID_SALT env var is required");
  process.exit(1);
}

function hashId(rawId: string): string {
  return createHmac("sha256", SALT!).update(rawId).digest("hex");
}

const db = new Database(DB_PATH);

// Get all users with their current (raw) telegram_id_hash values
const rows = db.prepare("SELECT id, telegram_id_hash FROM users").all() as {
  id: number;
  telegram_id_hash: string;
}[];

console.log(`Found ${rows.length} users to migrate.`);

const update = db.prepare(
  "UPDATE users SET telegram_id_hash = ? WHERE id = ?",
);

let migrated = 0;
let skipped = 0;

const tx = db.transaction(() => {
  for (const row of rows) {
    const raw = row.telegram_id_hash;

    // Skip if already looks like a hash (64 hex chars = sha256)
    if (/^[a-f0-9]{64}$/.test(raw)) {
      skipped++;
      continue;
    }

    const hashed = hashId(raw);
    update.run(hashed, row.id);
    migrated++;
  }
});

tx();

console.log(`Migration complete: ${migrated} hashed, ${skipped} already hashed.`);
db.close();
