#!/bin/bash
set -e

# First-time setup for OpenVPN + Cloak
# Run once on the server after docker compose is configured

SERVER_IP=${1:?usage: init-openvpn-cloak.sh <server-ip> [cloak-port]}
CLOAK_PORT=${2:-4443}

echo "=== Initializing OpenVPN + Cloak ==="
echo "Server: $SERVER_IP"
echo "Cloak port: $CLOAK_PORT"
echo ""

# 1. Generate OpenVPN server config (TCP mode)
echo "--- Step 1: Generate OpenVPN config ---"
docker compose run --rm openvpn ovpn_genconfig \
  -u "tcp://$SERVER_IP:$CLOAK_PORT" \
  -e "proto tcp" \
  -e "sndbuf 0" \
  -e "rcvbuf 0"

# 2. Initialize PKI (no passphrase for automation)
echo ""
echo "--- Step 2: Initialize PKI ---"
docker compose run --rm -e EASYRSA_BATCH=1 openvpn ovpn_initpki nopass

# 3. Generate shared client certificate (all users share this cert)
echo ""
echo "--- Step 3: Generate shared client certificate ---"
docker compose run --rm openvpn easyrsa build-client-full shared nopass

# 4. Start Cloak to auto-generate keypair
echo ""
echo "--- Step 4: Start Cloak (generates keypair on first run) ---"
docker compose up -d cloak
sleep 3

# Read Cloak public key
CLOAK_PUB=$(docker compose exec cloak cat /etc/cloak/ckpub.key 2>/dev/null || echo "")
if [ -z "$CLOAK_PUB" ]; then
  echo "WARNING: Could not read Cloak public key. Check Cloak container logs."
else
  echo "Cloak public key: $CLOAK_PUB"
fi

# 5. Start everything
echo ""
echo "--- Step 5: Starting all services ---"
docker compose up -d

echo ""
echo "=== Setup complete ==="
echo ""
echo "Add these to your .env file:"
echo "  CLOAK_PUBLIC_KEY=$CLOAK_PUB"
echo "  CLOAK_PORT=$CLOAK_PORT"
echo "  OPENVPN_CLOAK_ENABLED=true"
echo ""
echo "Don't forget to open TCP port $CLOAK_PORT in your firewall."
