ALTER TABLE `users` ADD `shadowtls_username` text;--> statement-breakpoint
ALTER TABLE `users` ADD `shadowtls_password` text;--> statement-breakpoint
ALTER TABLE `users` ADD `shadowtls_ss_password` text;--> statement-breakpoint
CREATE UNIQUE INDEX `users_shadowtls_username_unique` ON `users` (`shadowtls_username`);
