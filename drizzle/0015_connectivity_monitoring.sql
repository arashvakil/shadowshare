CREATE TABLE `connection_snapshots` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `user_id` integer NOT NULL REFERENCES `users`(`id`),
  `provider` text NOT NULL,
  `is_online` integer DEFAULT 0 NOT NULL,
  `bytes_transferred` integer DEFAULT 0 NOT NULL,
  `snapshot_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);--> statement-breakpoint
CREATE INDEX `idx_conn_snap_user_time` ON `connection_snapshots` (`user_id`, `snapshot_at`);--> statement-breakpoint
CREATE INDEX `idx_conn_snap_time` ON `connection_snapshots` (`snapshot_at`);--> statement-breakpoint
CREATE TABLE `connectivity_events` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `event_type` text NOT NULL,
  `severity` text NOT NULL,
  `affected_count` integer NOT NULL,
  `total_active` integer NOT NULL,
  `affected_protocols` text,
  `details` text,
  `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);--> statement-breakpoint
CREATE INDEX `idx_conn_events_time` ON `connectivity_events` (`created_at`);
