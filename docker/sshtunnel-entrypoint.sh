#!/bin/bash
set -e

SSH_PORT="${SSH_PORT:-2002}"
UDPGW_PORT="${UDPGW_PORT:-7300}"
SSH_PASSWORD="${SSH_PASSWORD:?SSH_PASSWORD is required}"
MAX_CLIENTS="${MAX_CLIENTS:-50}"

# Create tunnel user
if ! id tunnel &>/dev/null; then
    useradd -m -s /bin/sh tunnel
fi
echo "tunnel:${SSH_PASSWORD}" | chpasswd

# Generate host keys if missing (persist via volume)
HOST_KEY_DIR="/etc/sshtunnel/keys"
mkdir -p "$HOST_KEY_DIR"

if [ ! -f "$HOST_KEY_DIR/dropbear_ecdsa_host_key" ]; then
    echo "Generating ECDSA host key..."
    dropbearkey -t ecdsa -f "$HOST_KEY_DIR/dropbear_ecdsa_host_key"
fi
if [ ! -f "$HOST_KEY_DIR/dropbear_ed25519_host_key" ]; then
    echo "Generating Ed25519 host key..."
    dropbearkey -t ed25519 -f "$HOST_KEY_DIR/dropbear_ed25519_host_key"
fi

# Start badvpn-udpgw in background
echo "Starting badvpn-udpgw on 127.0.0.1:${UDPGW_PORT}..."
badvpn-udpgw \
    --listen-addr "127.0.0.1:${UDPGW_PORT}" \
    --max-clients "$MAX_CLIENTS" \
    --max-connections-for-client 10 &

# Start Dropbear SSH server
echo "Starting Dropbear SSH on port ${SSH_PORT}..."
exec dropbear \
    -F -E \
    -p "${SSH_PORT}" \
    -w \
    -K 30 \
    -a \
    -r "$HOST_KEY_DIR/dropbear_ecdsa_host_key" \
    -r "$HOST_KEY_DIR/dropbear_ed25519_host_key"
