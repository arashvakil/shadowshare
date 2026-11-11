ALTER TABLE `users` ADD `naive_username` text;--> statement-breakpoint
ALTER TABLE `users` ADD `naive_password` text;--> statement-breakpoint
CREATE UNIQUE INDEX `users_naive_username_unique` ON `users` (`naive_username`);
