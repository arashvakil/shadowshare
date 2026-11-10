-- Remove PII: hash telegram IDs, drop username, add label
-- Step 1: Rename telegram_id → telegram_id_hash
ALTER TABLE `users` RENAME COLUMN `telegram_id` TO `telegram_id_hash`;
--> statement-breakpoint

-- Step 2: Drop telegram_username column
ALTER TABLE `users` DROP COLUMN `telegram_username`;
--> statement-breakpoint

-- Step 3: Add label column (used for admin invite labels)
ALTER TABLE `users` ADD COLUMN `label` text;
