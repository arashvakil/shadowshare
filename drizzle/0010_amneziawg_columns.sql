ALTER TABLE `users` ADD `amneziawg_peer_id` text;--> statement-breakpoint
ALTER TABLE `users` ADD `amneziawg_config` text;--> statement-breakpoint
CREATE UNIQUE INDEX `users_amneziawg_peer_id_unique` ON `users` (`amneziawg_peer_id`);
