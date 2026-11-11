#!/usr/bin/env bash
# Auto-ban scanners hitting Dropbear (port 2222) inside shadowshare-dnstm-1.
# Watches docker logs for repeated pre-auth failures and blocks source IPs
# in the DOCKER-USER iptables chain.
#
# Threshold: BAN_AFTER failures within WINDOW_SECONDS = ban for BAN_DURATION.
# Bans are persisted to /etc/iptables/rules.v4 via netfilter-persistent.
#
# Legit NPV Tunnel users produce "Password auth succeeded" lines and are never
# counted as failures. The whitelist below skips private ranges and the host.

set -euo pipefail

CONTAINER="shadowshare-dnstm-1"
BAN_AFTER=10
WINDOW_SECONDS=300
LOG_FILE="/var/log/dnstm-autoban.log"
STATE_FILE="/var/lib/dnstm-autoban/failures.tsv"
BAN_FILE="/var/lib/dnstm-autoban/banned.tsv"

# Whitelist (never ban). Docker bridge, private nets, loopback, host's public IP.
WHITELIST_REGEX='^(127\.|10\.|192\.168\.|172\.(1[6-9]|2[0-9]|3[01])\.|167\.235\.130\.88$)'

mkdir -p "$(dirname "$STATE_FILE")"
: > "$STATE_FILE.tmp" 2>/dev/null || true

log() {
  echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) $*" | tee -a "$LOG_FILE" >&2
}

is_whitelisted() {
  local ip="$1"
  [[ "$ip" =~ $WHITELIST_REGEX ]]
}

is_already_banned() {
  local ip="$1"
  iptables -C DOCKER-USER -s "$ip" -j DROP 2>/dev/null
}

ban_ip() {
  local ip="$1"
  if is_already_banned "$ip"; then
    return
  fi
  iptables -I DOCKER-USER -s "$ip" -j DROP
  echo -e "$(date -u +%s)\t$ip" >> "$BAN_FILE"
  log "BANNED $ip (>=${BAN_AFTER} pre-auth failures in ${WINDOW_SECONDS}s)"
  # Persist asynchronously so we don't slow the log stream
  ( netfilter-persistent save >/dev/null 2>&1 ) &
}

prune_old_failures() {
  local now cutoff
  now=$(date -u +%s)
  cutoff=$((now - WINDOW_SECONDS))
  if [[ -f "$STATE_FILE" ]]; then
    awk -v c="$cutoff" '$1 >= c' "$STATE_FILE" > "$STATE_FILE.tmp" && \
      mv "$STATE_FILE.tmp" "$STATE_FILE"
  fi
}

count_failures() {
  local ip="$1"
  if [[ -f "$STATE_FILE" ]]; then
    awk -v ip="$ip" '$2 == ip' "$STATE_FILE" | wc -l
  else
    echo 0
  fi
}

record_failure() {
  local ip="$1" now
  now=$(date -u +%s)
  echo -e "${now}\t${ip}" >> "$STATE_FILE"
}

log "starting (BAN_AFTER=${BAN_AFTER}, WINDOW=${WINDOW_SECONDS}s, container=${CONTAINER})"

# Use --since=1s to skip historical lines on startup
docker logs --since 1s -f "$CONTAINER" 2>&1 | \
  grep --line-buffered -E 'Exit before auth from <[0-9.]+:[0-9]+>' | \
  while IFS= read -r line; do
    ip=$(echo "$line" | grep -oE 'from <[0-9.]+:' | grep -oE '[0-9.]+' | head -1)
    [[ -z "$ip" ]] && continue
    if is_whitelisted "$ip"; then continue; fi
    if is_already_banned "$ip"; then continue; fi

    record_failure "$ip"
    prune_old_failures
    count=$(count_failures "$ip")

    if (( count >= BAN_AFTER )); then
      ban_ip "$ip"
    fi
  done
