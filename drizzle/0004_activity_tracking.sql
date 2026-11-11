-- Add activity tracking columns
ALTER TABLE `users` ADD COLUMN `last_known_bandwidth` integer NOT NULL DEFAULT 0;
--> statement-breakpoint
ALTER TABLE `users` ADD COLUMN `last_active_at` text;
