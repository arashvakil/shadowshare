CREATE TABLE `invitation_codes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`code` text NOT NULL,
	`max_uses` integer DEFAULT 50 NOT NULL,
	`used_count` integer DEFAULT 0 NOT NULL,
	`description` text,
	`expires_at` text,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `invitation_codes_code_unique` ON `invitation_codes` (`code`);--> statement-breakpoint
CREATE TABLE `usage_snapshots` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`outline_key_id` text NOT NULL,
	`bytes_transferred` integer NOT NULL,
	`snapshot_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`telegram_id` text NOT NULL,
	`telegram_username` text,
	`outline_key_id` text,
	`outline_access_url` text,
	`invitation_code_id` integer,
	`language` text DEFAULT 'fa' NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`invitation_code_id`) REFERENCES `invitation_codes`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_telegram_id_unique` ON `users` (`telegram_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_outline_key_id_unique` ON `users` (`outline_key_id`);