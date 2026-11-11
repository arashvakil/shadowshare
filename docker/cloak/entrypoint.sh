#!/bin/sh
set -e

CONFIG=/etc/cloak/ckserver.json

if [ ! -f "$CONFIG" ]; then
  echo "Generating Cloak server keypair..."
  # Strip ANSI escape codes — ck-server v2.8.0 outputs colored text
  KEYS=$(/usr/local/bin/ck-server -key 2>&1 | sed 's/\x1b\[[0-9;]*m//g' || true)
  PRIVATE=$(echo "$KEYS" | grep -i "private" | awk '{print $NF}')
  PUBLIC=$(echo "$KEYS" | grep -i "public" | awk '{print $NF}')

  if [ -z "$PRIVATE" ] || [ -z "$PUBLIC" ]; then
    echo "ERROR: Failed to generate keypair. Output: $KEYS"
    exit 1
  fi

  # Save public key for client config generation
  echo "$PUBLIC" > /etc/cloak/ckpub.key

  # Generate a BypassUID for shared client access
  UID_DATA=$(/usr/local/bin/ck-server -uid 2>&1 | sed 's/\x1b\[[0-9;]*m//g' || true)
  BYPASS_UID=$(echo "$UID_DATA" | grep -v "^$" | tail -1 | sed 's/.*: *//')
  if [ -z "$BYPASS_UID" ]; then
    echo "WARNING: Could not generate BypassUID."
  else
    echo "$BYPASS_UID" > /etc/cloak/ckuid.key
  fi

  # Redirect address — what DPI sees if it probes the server
  REDIR=${CLOAK_REDIR_ADDR:-www.bing.com}

  cat > "$CONFIG" <<EOF
{
  "ProxyBook": {
    "openvpn": ["tcp", "${CLOAK_UPSTREAM:-openvpn:1194}"]
  },
  "BindAddr": [":443"],
  "RedirAddr": "${REDIR}",
  "PrivateKey": "${PRIVATE}",
  "BypassUID": ["${BYPASS_UID}"]
}
EOF

  echo "Cloak config generated."
  echo "Public key: $PUBLIC"
  echo "BypassUID: $BYPASS_UID"
  echo "Redirect: $REDIR"
fi

echo "Starting Cloak server..."
exec /usr/local/bin/ck-server -c "$CONFIG"
