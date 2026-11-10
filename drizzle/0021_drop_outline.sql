DROP INDEX IF EXISTS `users_outline_key_id_unique`;--> statement-breakpoint
ALTER TABLE `users` DROP COLUMN `outline_key_id`;--> statement-breakpoint
ALTER TABLE `users` DROP COLUMN `outline_access_url`;
