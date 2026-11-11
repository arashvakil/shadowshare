ALTER TABLE `users` ADD `ssh_public_key` text;--> statement-breakpoint
ALTER TABLE `users` ADD `ssh_private_key` text;--> statement-breakpoint
ALTER TABLE `users` ADD `mieru_username` text;--> statement-breakpoint
ALTER TABLE `users` ADD `mieru_password` text;--> statement-breakpoint
CREATE UNIQUE INDEX `users_ssh_public_key_unique` ON `users` (`ssh_public_key`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_mieru_username_unique` ON `users` (`mieru_username`);
