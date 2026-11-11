#!/bin/bash
set -e

DOMAIN="${TUNNEL_DOMAIN:?TUNNEL_DOMAIN must be set}"
MTU="${DNSTT_MTU:-1232}"
SOCKS_ADDR="singbox:10053"
KEY_DIR="/etc/dnstm/keys"
SSH_PORT=2222
SSH_PASSWORD="${DNSTT_SSH_PASSWORD:-}"
MASTERDNS_KEY="${MASTERDNS_ENCRYPTION_KEY:-}"
MASTERDNS_SUBDOMAIN="${MASTERDNS_SUBDOMAIN:-m}"

echo "[dnstm] Domain: ${DOMAIN}"
echo "[dnstm] SOCKS5 upstream: ${SOCKS_ADDR}"
echo "[dnstm] MTU: ${MTU}"

# Check for dnstt keypair
if [ ! -f "${KEY_DIR}/server.key" ]; then
  echo "[dnstm] ERROR: Missing ${KEY_DIR}/server.key — generate a keypair first:"
  echo "  dnstt-server -gen-key -privkey-file server.key -pubkey-file server.pub"
  exit 1
fi

PRIVKEY_FILE="${KEY_DIR}/server.key"

# --- Configure dropbear SSH for DNSTT relay ---
# Dropbear has a much smaller handshake than OpenSSH (~40s vs 5min+ over 132-byte MTU DNS tunnel)
if [ -n "${SSH_PASSWORD}" ]; then
  echo "[dnstm] Configuring SSH relay on port ${SSH_PORT}..."
  echo "tunnel:${SSH_PASSWORD}" | chpasswd

  # Persist host keys via volume so they don't change between restarts
  # (HTTP Injector caches host keys — key change causes handshake failure)
  HOST_KEY_DIR="/etc/dnstm/ssh-host-keys"
  mkdir -p "${HOST_KEY_DIR}"
  DROPBEAR_DIR="/etc/dropbear"
  mkdir -p "${DROPBEAR_DIR}"

  for keytype in ecdsa ed25519; do
    volkey="${HOST_KEY_DIR}/dropbear_${keytype}_host_key"
    syskey="${DROPBEAR_DIR}/dropbear_${keytype}_host_key"
    if [ ! -f "${volkey}" ]; then
      dropbearkey -t "${keytype}" -f "${volkey}" 2>/dev/null
      echo "[dnstm] Generated ${keytype} host key (persisted)"
    fi
    cp "${volkey}" "${syskey}"
  done

  echo "[dnstm] SSH relay available at 127.0.0.1:${SSH_PORT} (legacy, for HTTP Injector)"
fi

# Always forward DNSTT directly to SOCKS5 proxy — SlipNet (primary client) expects
# a SOCKS5 server at the far end, not SSH. HTTP Injector (iOS) is deprecated.
DNSTT_TARGET="${SOCKS_ADDR}"
echo "[dnstm] DNSTT will tunnel to SOCKS5 at ${DNSTT_TARGET}"

# --- Configure Unbound as DNS router ---
# Tunnel servers (Slipstream, DNSTT) encode data in DNS responses that standard
# DNS servers (Unbound, dnsdist) reject during response validation.
# Use a minimal Python UDP proxy that routes by qname suffix without parsing responses.
cat > /usr/local/bin/dns-router.py << 'PYEOF'
#!/usr/bin/env python3
"""DNS router for DNSTT — only forwards encoded tunnel queries, refuses everything else.

DNSTT/Slipstream encode data in long subdomain labels (base32/hex).
Normal DNS probes (e.g. "test.d2.example.com") have short labels.
We filter by label length to prevent the server from appearing as an open resolver
(BSI/CERT-Bund flags any DNS server that responds to arbitrary queries).
"""
import socket, sys, threading, struct

LISTEN = ("0.0.0.0", 53)
ROUTES = {}  # suffix -> (host, port)
# Routes that skip label-length filtering (e.g. MasterDnsVPN has its own protocol/auth)
PASSTHROUGH_ROUTES = set()
# Minimum length of the first subdomain label to be considered tunnel traffic.
# DNSTT uses base32-encoded payloads = long labels (typically 50+ chars).
# Normal probes like "test.d2.example.com" have short first labels (4 chars).
MIN_TUNNEL_LABEL_LEN = 16

def parse_qname_labels(data):
    """Extract qname labels from DNS query."""
    if len(data) < 12:
        return []
    pos = 12
    labels = []
    while pos < len(data):
        length = data[pos]
        if length == 0:
            break
        if length > 63 or pos + 1 + length > len(data):
            return []  # malformed
        pos += 1
        labels.append(data[pos:pos+length].decode("ascii", errors="replace").lower())
        pos += length
    return labels

def make_refused(data):
    """Build a REFUSED response for a DNS query (RCODE=5).
    This tells scanners the server is not an open resolver."""
    if len(data) < 12:
        return None
    # Copy the query ID, set QR=1 (response), RCODE=5 (REFUSED)
    flags = struct.unpack("!H", data[2:4])[0]
    flags = (flags | 0x8000) & 0xFF00  # QR=1, clear RA/AA/TC/RCODE
    flags |= 0x0005  # RCODE=REFUSED
    return data[:2] + struct.pack("!H", flags) + data[4:]

def is_tunnel_query(qname_labels, suffix_labels_count):
    """Check if the query looks like encoded tunnel data vs a normal DNS probe.
    Tunnel queries have the encoded payload in subdomain labels before the suffix."""
    # Labels before the route suffix are the tunnel payload
    payload_labels = qname_labels[:len(qname_labels) - suffix_labels_count]
    if not payload_labels:
        return False
    # DNSTT encodes data in the first label(s) — check if any are long enough
    return any(len(label) >= MIN_TUNNEL_LABEL_LEN for label in payload_labels)

def forward(sock):
    """Receive from client, route tunnel queries, refuse everything else."""
    while True:
        try:
            data, client_addr = sock.recvfrom(4096)
            labels = parse_qname_labels(data)
            qname = ".".join(labels)

            target = None
            suffix_label_count = 0
            for suffix, backend in ROUTES.items():
                if qname.endswith(suffix):
                    target = backend
                    suffix_label_count = suffix.count(".") + 1
                    break

            if not target:
                # Not a tunnel domain — send REFUSED
                refused = make_refused(data)
                if refused:
                    sock.sendto(refused, client_addr)
                continue

            if suffix not in PASSTHROUGH_ROUTES and not is_tunnel_query(labels, suffix_label_count):
                # Matches tunnel domain suffix but not encoded data — REFUSED
                # This blocks probes like "test.d2.example.com"
                # (Passthrough routes like MasterDnsVPN have their own auth/encryption)
                refused = make_refused(data)
                if refused:
                    sock.sendto(refused, client_addr)
                continue

            # Looks like real tunnel traffic — forward to backend
            bsock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            bsock.settimeout(10)
            bsock.sendto(data, target)
            def relay(bsock, client_addr, sock):
                try:
                    resp, _ = bsock.recvfrom(4096)
                    sock.sendto(resp, client_addr)
                except:
                    pass
                finally:
                    bsock.close()
            threading.Thread(target=relay, args=(bsock, client_addr, sock), daemon=True).start()
        except Exception as e:
            print(f"[dns-router] error: {e}", file=sys.stderr, flush=True)

if __name__ == "__main__":
    for arg in sys.argv[1:]:
        suffix, addr = arg.split("=", 1)
        host, port = addr.rsplit(":", 1)
        # '+' prefix marks passthrough routes (skip label-length filter)
        clean_suffix = suffix.lstrip("+").lower().rstrip(".")
        ROUTES[clean_suffix] = (host, int(port))
        if suffix.startswith("+"):
            PASSTHROUGH_ROUTES.add(clean_suffix)
    print(f"[dns-router] Routes: {ROUTES}", flush=True)
    print(f"[dns-router] Passthrough (no label filter): {PASSTHROUGH_ROUTES}", flush=True)
    print(f"[dns-router] Min tunnel label length: {MIN_TUNNEL_LABEL_LEN}", flush=True)
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    sock.bind(LISTEN)
    print(f"[dns-router] Listening on {LISTEN[0]}:{LISTEN[1]} (REFUSED for non-tunnel queries)", flush=True)
    forward(sock)
PYEOF
chmod +x /usr/local/bin/dns-router.py

echo "[dnstm] DNS router configured"

# --- Start dropbear SSH relay (if configured) ---
UDPGW_PID=""
if [ -n "${SSH_PASSWORD}" ]; then
  echo "[dnstm] Starting Dropbear SSH on :${SSH_PORT}..."
  # -F: foreground, -E: stderr, -p: port
  # -w: disallow root, -K 0: disable keepalive (DNS tunnel is too slow/lossy), -a: allow forwarding from any host
  dropbear -F -E -p "${SSH_PORT}" -w -K 0 -a 2>&1 &
  SSH_PID=$!

  # Start badvpn-udpgw for UDP traffic over SSH (required by NPV Tunnel, HTTP Injector, etc.)
  echo "[dnstm] Starting badvpn-udpgw on :7300..."
  badvpn-udpgw --listen-addr 127.0.0.1:7300 --max-clients 20 --max-connections-for-client 10 &
  UDPGW_PID=$!
fi

# --- Start Slipstream tunnel (QUIC-over-DNS) on t2 subdomain ---
echo "[dnstm] Starting Slipstream server on :5353 for t2.${DOMAIN}..."
slipstream-server \
  --listen "0.0.0.0:5353" \
  --target "${SOCKS_ADDR}" \
  --domain "t2.${DOMAIN}" \
  &
SLIP_PID=$!

# --- Start DNSTT tunnel (NoizDNS variant) on d2 subdomain → SOCKS5 (for SlipNet/Android) ---
echo "[dnstm] Starting DNSTT server on :5300 for d2.${DOMAIN} → ${DNSTT_TARGET}..."
dnstt-server \
  -udp ":5300" \
  -privkey-file "${PRIVKEY_FILE}" \
  -mtu "${MTU}" \
  "d2.${DOMAIN}" "${DNSTT_TARGET}" \
  &
DNSTT_PID=$!

# --- Start DNSTT tunnel on d3 subdomain → SSH (for NPV Tunnel/iOS) ---
# NPV Tunnel's SSH-DNSTT mode expects SSH on the far end, not SOCKS5.
# Same keypair, different subdomain and target.
DNSTT_SSH_PID=""
if [ -n "${SSH_PASSWORD}" ]; then
  echo "[dnstm] Starting DNSTT server on :5301 for d3.${DOMAIN} → 127.0.0.1:${SSH_PORT}..."
  dnstt-server \
    -udp ":5301" \
    -privkey-file "${PRIVKEY_FILE}" \
    -mtu "${MTU}" \
    "d3.${DOMAIN}" "127.0.0.1:${SSH_PORT}" \
    &
  DNSTT_SSH_PID=$!
fi

# --- Start MasterDnsVPN tunnel on m subdomain (if configured) ---
MASTERDNS_PID=""
if [ -n "${MASTERDNS_KEY}" ]; then
  MASTERDNS_PORT=5302
  MASTERDNS_KEY_FILE="/etc/dnstm/masterdns_encrypt_key.txt"
  MASTERDNS_CONFIG="/etc/dnstm/masterdns_server.toml"

  # Persist encryption key
  echo -n "${MASTERDNS_KEY}" > "${MASTERDNS_KEY_FILE}"

  # Generate server config
  # Compression + control-block duplication tuned for Iran's lossy links.
  cat > "${MASTERDNS_CONFIG}" << TOMLEOF
DOMAIN = ["${MASTERDNS_SUBDOMAIN}.${DOMAIN}"]
PROTOCOL_TYPE = "SOCKS5"
SUPPORTED_UPLOAD_COMPRESSION_TYPES = [0, 1, 2, 3]
SUPPORTED_DOWNLOAD_COMPRESSION_TYPES = [0, 1, 2, 3]
UDP_HOST = "0.0.0.0"
UDP_PORT = ${MASTERDNS_PORT}
DATA_ENCRYPTION_METHOD = 5
ENCRYPTION_KEY_FILE = "${MASTERDNS_KEY_FILE}"
DNS_UPSTREAM_SERVERS = ["1.1.1.1:53", "1.0.0.1:53"]
USE_EXTERNAL_SOCKS5 = true
FORWARD_IP = "${SOCKS_ADDR%%:*}"
FORWARD_PORT = 10054
PACKET_BLOCK_CONTROL_DUPLICATION = 2
MAX_ALLOWED_CLIENT_UPLOAD_MTU = 150
MAX_ALLOWED_CLIENT_DOWNLOAD_MTU = 4096
LOG_LEVEL = "INFO"
CONFIG_VERSION = "12"
TOMLEOF

  echo "[dnstm] Starting MasterDnsVPN server on :${MASTERDNS_PORT} for ${MASTERDNS_SUBDOMAIN}.${DOMAIN}..."
  masterdnsvpn-server -config "${MASTERDNS_CONFIG}" &
  MASTERDNS_PID=$!
fi

# Brief pause for backends to bind their ports
sleep 1

# --- Start DNS router on port 53 ---
# Build route arguments dynamically
ROUTER_ARGS=(
  "t2.${DOMAIN}=127.0.0.1:5353"
  "d2.${DOMAIN}=127.0.0.1:5300"
  "d3.${DOMAIN}=127.0.0.1:5301"
)
if [ -n "${MASTERDNS_KEY}" ]; then
  # '+' prefix = passthrough (MasterDnsVPN has its own encryption/auth, skip label-length filter)
  ROUTER_ARGS+=("+${MASTERDNS_SUBDOMAIN}.${DOMAIN}=127.0.0.1:5302")
fi

echo "[dnstm] Starting DNS router on :53..."
python3 /usr/local/bin/dns-router.py "${ROUTER_ARGS[@]}" &
ROUTER_PID=$!

echo "[dnstm] All services started (router=${ROUTER_PID}, slipstream=${SLIP_PID}, dnstt=${DNSTT_PID}${DNSTT_SSH_PID:+, dnstt-ssh=${DNSTT_SSH_PID}}${SSH_PID:+, ssh=${SSH_PID}}${MASTERDNS_PID:+, masterdns=${MASTERDNS_PID}})"

# Wait for any child to exit
wait -n
EXIT_CODE=$?
echo "[dnstm] A child process exited (code ${EXIT_CODE}), shutting down..."
kill ${ROUTER_PID} ${SLIP_PID} ${DNSTT_PID} ${DNSTT_SSH_PID:-} ${SSH_PID:-} ${UDPGW_PID:-} ${MASTERDNS_PID:-} 2>/dev/null || true
wait
exit ${EXIT_CODE}
