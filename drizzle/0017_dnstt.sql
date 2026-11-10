ALTER TABLE users ADD COLUMN dnstt_socks_username TEXT; --> statement-breakpoint
ALTER TABLE users ADD COLUMN dnstt_socks_password TEXT; --> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS idx_dnstt_socks_username ON users(dnstt_socks_username);
