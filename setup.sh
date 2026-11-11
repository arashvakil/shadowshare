#!/usr/bin/env bash
# First-time setup for a ShadowShare server.
#
#   ./setup.sh
#
# Creates .env, .env.marzban, Caddyfile and marzban-data/xray_config.json from
# the examples, and fills in everything that should be random and unique to
# your server:
#   - secrets and passwords (salt, admin, session, Marzban, SSH tunnel)
#   - CDN transport paths (WS, HTTPUpgrade, gRPC, XHTTP, XHTTP-Reality)
#   - Reality keys and short IDs
#   - AmneziaWG 2.0 obfuscation parameters
#   - an MTProto FakeTLS secret
#   - a decoy landing page (scripts/gen-decoy.sh)
#   - a self-signed cert for Marzban's internal API
#
# Censors fingerprint public defaults, so none of these values ship in the repo.
# The script never overwrites a value that's already set, so it is safe to re-run.
# What it can't pick for you (your domains, IP and cover SNIs) is listed at the end.
set -euo pipefail
cd "$(dirname "$0")"

need() { command -v "$1" >/dev/null || { echo "setup: '$1' is required" >&2; exit 1; }; }
need openssl; need sed; need awk

hex() { openssl rand -hex "$1"; }
b64url() { openssl rand -base64 "$1" | tr '+/' '-_' | tr -d '=\n'; }
rnd() { echo $(( $1 + $(od -An -N4 -tu4 /dev/urandom | tr -d ' ') % ($2 - $1 + 1) )); }
pick() { local a=("$@"); echo "${a[$(rnd 0 $((${#a[@]} - 1)))]}"; }

copy_once() { [[ -e "$2" ]] && echo "  keep   $2" || { mkdir -p "$(dirname "$2")"; cp "$1" "$2"; echo "  create $2"; }; }

# Set KEY=VALUE in a dotenv file, only if KEY is empty or missing.
set_env() {
  local file=$1 key=$2 value=$3 current
  current=$(grep -E "^${key}=" "$file" | head -1 | cut -d= -f2- || true)
  if [[ -n "$current" ]]; then return; fi
  if grep -qE "^${key}=" "$file"; then
    sed -i.bak "s|^${key}=.*|${key}=${value}|" "$file" && rm -f "$file.bak"
  else
    echo "${key}=${value}" >> "$file"
  fi
  echo "  set    ${key}"
}
get_env() { grep -E "^$2=" "$1" | head -1 | cut -d= -f2- || true; }

# Replace an example default only while it still has the shipped value.
set_default() {
  local file=$1 key=$2 shipped=$3 value=$4
  if [[ "$(get_env "$file" "$key")" == "$shipped" ]]; then
    sed -i.bak "s|^${key}=.*|${key}=${value}|" "$file" && rm -f "$file.bak"
    echo "  set    ${key}"
  fi
}

# A path that looks like ordinary static-asset traffic, e.g. /media/3f9a1c
path() { echo "/$(pick assets static media cdn img lib files content res dist)/$(hex 3)"; }

echo "Config files"
copy_once .env.example .env
copy_once .env.marzban.example .env.marzban
copy_once Caddyfile.example Caddyfile
copy_once marzban/xray_config.example.json marzban-data/xray_config.json

echo "Secrets"
set_env .env TELEGRAM_ID_SALT "$(hex 32)"
set_env .env ADMIN_PASSWORD "$(b64url 18)"
set_env .env ADMIN_SESSION_SECRET "$(hex 32)"
set_env .env MARZBAN_USERNAME admin
set_env .env MARZBAN_PASSWORD "$(b64url 18)"
set_env .env DNSTT_SSH_PASSWORD "$(b64url 15)"
set_env .env.marzban SUDO_USERNAME "$(get_env .env MARZBAN_USERNAME)"
set_env .env.marzban SUDO_PASSWORD "$(get_env .env MARZBAN_PASSWORD)"

echo "Transport paths"
set_default .env CDN_WS_PATH /ws "$(path)"
set_default .env CDN_HU_PATH /hu "$(path)"
set_default .env CDN_GRPC_PATH /grpc "/$(pick api rpc svc data sync)$(hex 3)"
set_default .env CDN_XHTTP_PATH /xh "$(path)"
WS=$(get_env .env CDN_WS_PATH); HU=$(get_env .env CDN_HU_PATH)
GRPC=$(get_env .env CDN_GRPC_PATH); XH=$(get_env .env CDN_XHTTP_PATH)

echo "AmneziaWG obfuscation"
S1=$(rnd 15 150); S2=$(rnd 15 150); while (( S1 + 56 == S2 )); do S2=$(rnd 15 150); done
set_env .env AWG_S1 "$S1"
set_env .env AWG_S2 "$S2"
# H1..H4: disjoint magnitude bands (AWG 2.0), a random sub-range inside each.
band() { local lo=$1 hi=$2 a b; a=$(rnd "$lo" $(( (lo + hi) / 2 ))); b=$(rnd $(( a + (hi - lo) / 8 )) "$hi"); echo "$a-$b"; }
set_env .env AWG_H1 "$(band 100000 800000)"
set_env .env AWG_H2 "$(band 1000000 8000000)"
set_env .env AWG_H3 "$(band 10000000 80000000)"
set_env .env AWG_H4 "$(band 100000000 800000000)"
JMIN=$(rnd 30 90)
set_env .env AWG_JC "$(rnd 3 10)"
set_env .env AWG_JMIN "$JMIN"
set_env .env AWG_JMAX "$(rnd $(( JMIN + 300 )) 1000)"

echo "MTProto proxy"
FAKETLS=$(get_env .env MTPROTO_FAKETLS_DOMAIN); FAKETLS=${FAKETLS:-cloudflare.com}
set_env .env MTPROTO_SECRET "ee$(hex 16)$(printf '%s' "$FAKETLS" | od -An -tx1 | tr -d ' \n')"

echo "Xray (Reality keys, paths)"
X=marzban-data/xray_config.json
x25519() { openssl genpkey -algorithm X25519 -outform DER | tail -c 32 | base64 | tr '+/' '-_' | tr -d '=\n'; }
# Each "privateKey": "" gets its own key; each placeholder short ID its own value.
while grep -q '"privateKey": ""' "$X"; do
  awk -v k="$(x25519)" '!d && /"privateKey": ""/ { sub(/"privateKey": ""/, "\"privateKey\": \"" k "\""); d=1 } 1' "$X" > "$X.tmp" && mv "$X.tmp" "$X"
  echo "  set    Reality private key"
done
while grep -q 'GENERATE_WITH_openssl_rand_hex_8' "$X"; do
  awk -v k="$(hex 8)" '!d && /GENERATE_WITH_openssl_rand_hex_8/ { sub(/GENERATE_WITH_openssl_rand_hex_8/, k); d=1 } 1' "$X" > "$X.tmp" && mv "$X.tmp" "$X"
  echo "  set    Reality short ID"
done
sub_json() { if grep -q "$1" "$X"; then sed -i.bak "s|$1|$2|" "$X" && rm -f "$X.bak"; echo "  set    $3"; fi; }
sub_json '"wsSettings": { "path": "/ws" }' "\"wsSettings\": { \"path\": \"$WS\" }" "WS path"
sub_json '"httpupgradeSettings": { "path": "/hu" }' "\"httpupgradeSettings\": { \"path\": \"$HU\" }" "HTTPUpgrade path"
sub_json '"grpcSettings": { "serviceName": "grpc" }' "\"grpcSettings\": { \"serviceName\": \"${GRPC#/}\" }" "gRPC service name"
sub_json '"xhttpSettings": { "path": "/xh/", "mode": "auto" }' "\"xhttpSettings\": { \"path\": \"$XH/\", \"mode\": \"auto\" }" "XHTTP path"
sub_json '"xhttpSettings": { "path": "/xr", "mode": "auto" }' "\"xhttpSettings\": { \"path\": \"$(path)\", \"mode\": \"auto\" }" "XHTTP-Reality path"

if [[ ! -e marzban-data/cert.pem ]]; then
  openssl req -x509 -newkey rsa:2048 -nodes -days 3650 -subj "/CN=marzban" \
    -keyout marzban-data/key.pem -out marzban-data/cert.pem 2>/dev/null
  echo "  create marzban-data/cert.pem (self-signed, Docker network only)"
fi
mkdir -p data

echo "Worker relay"
if grep -q '^ALLOWED_PATHS = "/ws,/hu"' worker-relay/wrangler.toml; then
  sed -i.bak "s|^ALLOWED_PATHS = \"/ws,/hu\"|ALLOWED_PATHS = \"$WS,$HU\"|" worker-relay/wrangler.toml && rm -f worker-relay/wrangler.toml.bak
  echo "  set    ALLOWED_PATHS"
fi

echo "Decoy site"
scripts/gen-decoy.sh | sed 's/^/  /'

chmod 600 .env .env.marzban

cat <<EOF

Done. Still yours to fill in (.env unless noted):
  PUBLIC_SERVER_IP, AWG_SERVER_IP     this server's public IPv4
  ORIGIN_HOST                         DNS-only hostname for this server
  CDN_SOURCE_DOMAIN, CDN_CLEAN_DOMAIN Cloudflare-proxied domain(s) for CDN transports
  MARZBAN_SUB_URL_BASE                https://<CDN_CLEAN_DOMAIN> (also XRAY_SUBSCRIPTION_URL_PREFIX in .env.marzban)
  REALITY_SNI, XHTTP_REALITY_SNI      cover sites reachable from your users' network
                                      (also replace them in marzban-data/xray_config.json)
  SHADOWTLS_DOMAIN, SHADOWTLS_HANDSHAKE_SERVER, DIRECT_TLS_DOMAIN, CLOUDFLARE_DNS_API_TOKEN
  ORIGIN_HOST in worker-relay/wrangler.toml, if you deploy the Worker relay

Your admin password is in .env (ADMIN_PASSWORD). Then: docker compose up -d
Full walkthrough: docs/deploy.md
EOF
