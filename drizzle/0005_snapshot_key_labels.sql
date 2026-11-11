-- Store key labels in snapshots so bandwidth graphs survive user deletion
ALTER TABLE `usage_snapshots` ADD COLUMN `key_label` text;
