ALTER TABLE `users` ADD `marzban_username` text;--> statement-breakpoint
ALTER TABLE `users` ADD `marzban_sub_url` text;--> statement-breakpoint
CREATE UNIQUE INDEX `users_marzban_username_unique` ON `users` (`marzban_username`);
