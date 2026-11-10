ALTER TABLE `users` ADD `hysteria2_password` text;--> statement-breakpoint
ALTER TABLE `users` ADD `tuic_uuid` text;--> statement-breakpoint
ALTER TABLE `users` ADD `tuic_password` text;--> statement-breakpoint
ALTER TABLE `users` ADD `trojan_password` text;--> statement-breakpoint
CREATE UNIQUE INDEX `users_tuic_uuid_unique` ON `users` (`tuic_uuid`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_trojan_password_unique` ON `users` (`trojan_password`);
