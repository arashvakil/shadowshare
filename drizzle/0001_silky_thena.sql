PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`telegram_id` text NOT NULL,
	`telegram_username` text,
	`outline_key_id` text,
	`outline_access_url` text,
	`invitation_code_id` integer,
	`language` text DEFAULT 'pi' NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`invitation_code_id`) REFERENCES `invitation_codes`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_users`("id", "telegram_id", "telegram_username", "outline_key_id", "outline_access_url", "invitation_code_id", "language", "is_active", "created_at") SELECT "id", "telegram_id", "telegram_username", "outline_key_id", "outline_access_url", "invitation_code_id", "language", "is_active", "created_at" FROM `users`;--> statement-breakpoint
DROP TABLE `users`;--> statement-breakpoint
ALTER TABLE `__new_users` RENAME TO `users`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `users_telegram_id_unique` ON `users` (`telegram_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_outline_key_id_unique` ON `users` (`outline_key_id`);