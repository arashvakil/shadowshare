#!/bin/bash
# Fetches the latest Hiddify arm64 APK from GitHub releases.
# Intended to run as a daily cron job.

set -euo pipefail

DEST="/opt/shadowshare/static/dl/hiddify.apk"
TMP="${DEST}.tmp"
VERSION_FILE="/opt/shadowshare/static/dl/.hiddify-version"

# Get latest release tag
LATEST=$(curl -sf https://api.github.com/repos/hiddify/hiddify-app/releases/latest | grep '"tag_name"' | head -1 | sed 's/.*"tag_name": *"\([^"]*\)".*/\1/')

if [ -z "$LATEST" ]; then
  echo "Failed to fetch latest version"
  exit 1
fi

# Check if we already have this version
if [ -f "$VERSION_FILE" ] && [ "$(cat "$VERSION_FILE")" = "$LATEST" ]; then
  echo "Already up to date: $LATEST"
  exit 0
fi

echo "Updating Hiddify APK to $LATEST..."
URL="https://github.com/hiddify/hiddify-app/releases/download/${LATEST}/Hiddify-Android-arm64.apk"

curl -fL -o "$TMP" "$URL"

# Verify it's a real APK (ZIP magic bytes)
if ! file "$TMP" | grep -q "Zip\|Android"; then
  echo "Downloaded file doesn't look like an APK, aborting"
  rm -f "$TMP"
  exit 1
fi

mv "$TMP" "$DEST"
echo "$LATEST" > "$VERSION_FILE"
echo "Updated to $LATEST ($(du -h "$DEST" | cut -f1))"
