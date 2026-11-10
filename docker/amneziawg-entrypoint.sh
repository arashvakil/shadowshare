#!/bin/bash
set -e

CONF_FILE="/etc/amneziawg/awg0.conf"

# Wait for ShadowShare to generate the config file
echo "[awg] Waiting for config at ${CONF_FILE}..."
while [ ! -f "$CONF_FILE" ]; do
  sleep 1
done
echo "[awg] Config found"

# Use userspace amneziawg-go (no kernel module needed)
export WG_QUICK_USERSPACE_IMPLEMENTATION=amneziawg-go

# Bring up the interface
awg-quick up "$CONF_FILE"
echo "[awg] Interface awg0 is up"

# Keep container running
exec sleep infinity
