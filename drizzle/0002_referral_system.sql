-- Migration: Replace invitation codes with referral system
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`telegram_id` text NOT NULL,
	`telegram_username` text,
	`outline_key_id` text,
	`outline_access_url` text,
	`referral_code` text,
	`referred_by` integer,
	`referral_count` integer DEFAULT 0 NOT NULL,
	`max_referrals` integer DEFAULT 5 NOT NULL,
	`language` text DEFAULT 'pi' NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`referred_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);--> statement-breakpoint
INSERT INTO `__new_users`("id", "telegram_id", "telegram_username", "outline_key_id", "outline_access_url", "language", "is_active", "created_at") SELECT "id", "telegram_id", "telegram_username", "outline_key_id", "outline_access_url", "language", "is_active", "created_at" FROM `users`;--> statement-breakpoint
DROP TABLE `users`;--> statement-breakpoint
ALTER TABLE `__new_users` RENAME TO `users`;--> statement-breakpoint
CREATE UNIQUE INDEX `users_telegram_id_unique` ON `users` (`telegram_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_outline_key_id_unique` ON `users` (`outline_key_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_referral_code_unique` ON `users` (`referral_code`);--> statement-breakpoint
DROP TABLE IF EXISTS `invitation_codes`;--> statement-breakpoint
PRAGMA foreign_keys=ON;
