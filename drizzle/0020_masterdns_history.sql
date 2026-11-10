CREATE TABLE IF NOT EXISTS masterdns_usage_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  snapshot_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  active_sessions INTEGER NOT NULL DEFAULT 0,
  upload_bytes_total INTEGER NOT NULL DEFAULT 0,
  download_bytes_total INTEGER NOT NULL DEFAULT 0,
  dnstm_rx_bytes INTEGER NOT NULL DEFAULT 0,
  dnstm_tx_bytes INTEGER NOT NULL DEFAULT 0,
  singbox_rx_bytes INTEGER NOT NULL DEFAULT 0,
  singbox_tx_bytes INTEGER NOT NULL DEFAULT 0
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_masterdns_history_snapshot_at
  ON masterdns_usage_history(snapshot_at);
