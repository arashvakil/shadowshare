#!/usr/bin/env bash
# Renders a decoy landing page into static/ from static/decoy/.
#
# Caddy serves static/ to anyone who opens your CDN domain in a browser. If every
# install served the same page, a censor could fetch it once and find every
# ShadowShare server. So each install gets its own brand, domain, colours, numbers,
# wording, feature list and section order. Re-run any time for a new one, or write
# your own static/index.html.
#
#   scripts/gen-decoy.sh            # random
#   BRAND="Lumen Edge" scripts/gen-decoy.sh
set -euo pipefail
cd "$(dirname "$0")/.."
T=static/decoy

rnd() { echo $(( $1 + $(od -An -N4 -tu4 /dev/urandom | tr -d ' ') % ($2 - $1 + 1) )); }
pick() { local a=("$@"); echo "${a[$(rnd 0 $((${#a[@]} - 1)))]}"; }
# Print the arguments in random order, one per line.
shuffle() { for x in "$@"; do echo "$(od -An -N4 -tu4 /dev/urandom | tr -d ' ') $x"; done | sort -n | cut -d' ' -f2-; }

# --- Brand --------------------------------------------------------------------
if [[ -n "${BRAND:-}" ]]; then
  B1="${BRAND%% *}"; B2="${BRAND#* }"; [[ "$B2" == "$BRAND" ]] && B2=""
else
  B1=$(pick Arc Lumen Vertex Helio Strata Quanta Nimbus Pulse Cirrus Zephyr Vela Terra Cobalt Halcyon Meridian Solace Kestrel Tessera Aster Corvid Larch Ostra Fenwick Brio Sable Tundra Wren Calyx)
  B2=$(pick CDN Edge Cloud Cache Stack Net Deliver Grid Relay Mesh)
fi
BRAND_FULL="${B1}${B2}"
SLUG=$(echo "$BRAND_FULL" | tr '[:upper:]' '[:lower:]' | tr -cd 'a-z0-9')
TLD=$(pick net io com cloud network dev)
APIVAR=$(echo "$B1" | tr '[:lower:]' '[:upper:]' | tr -cd 'A-Z')

# Accent colour: random hue, fixed saturation/lightness so it always looks deliberate.
read -r ACCENT ACCENT_HOVER ACCENT_DIM < <(awk -v seed="$RANDOM$RANDOM" 'BEGIN {
  srand(seed); h = rand(); s = 0.72
  n = split("0.58 0.50 0.32", L, " ")
  for (i = 1; i <= n; i++) {
    l = L[i]; q = (l < 0.5) ? l * (1 + s) : l + s - l * s; p = 2 * l - q
    printf "%s#%02x%02x%02x", (i > 1 ? " " : ""), hue(p, q, h + 1/3) * 255 + 0.5, hue(p, q, h) * 255 + 0.5, hue(p, q, h - 1/3) * 255 + 0.5
  }
  print ""
}
function hue(p, q, t) {
  if (t < 0) t += 1; if (t > 1) t -= 1
  if (t < 1/6) return p + (q - p) * 6 * t
  if (t < 1/2) return q
  if (t < 2/3) return p + (q - p) * (2/3 - t) * 6
  return p
}')

# --- Numbers ------------------------------------------------------------------
REGIONS=("EU-Central (Frankfurt)" "EU-West (Amsterdam)" "EU-North (Helsinki)" "EU-West (Paris)" "US-East (Ashburn)" "US-West (San Jose)" "AP-Southeast (Singapore)" "EU-Central (Warsaw)" "EU-South (Milan)" "UK (London)" "EU-North (Stockholm)" "AP-Northeast (Tokyo)")
codes=(fra ams hel par iad sjc sin waw mil lon sto nrt)
i=$(rnd 0 $((${#REGIONS[@]} - 1)))
REGION="${REGIONS[$i]}"
NODE="$(echo "${REGION%%-*}" | tr '[:upper:]' '[:lower:]' | cut -c1-2)-${codes[$i]}-$(printf '%02d' "$(rnd 1 30)")"
LOCATIONS=$(rnd 24 96)
LOCROUND=$(( LOCATIONS / 10 * 10 ))
VERSION="$(rnd 2 6).$(rnd 0 12).$(rnd 0 24)"
YEAR=$(date +%Y)
UPTIME=$(pick 99.9% 99.95% 99.99% 99.98%)
CAPACITY="$(rnd 6 48) Tbps"
RPS="$(rnd 1 9).$(rnd 0 9)M"

# --- Copy -----------------------------------------------------------------------
# Keep entries free of "|" and "&" (they are sed metacharacters here).
HEADLINE=$(pick "Fast. Global. Reliable." "Your content, everywhere." "Built for the edge." "Delivery without the wait." "Speed at every hop." "The edge, simplified." "Closer to every user." "Less latency. More reach.")
TAGLINE=$(pick \
  "Accelerate your content delivery with our worldwide edge network. Low-latency caching, automatic failover, and real-time analytics." \
  "Serve static assets, APIs and video from $LOCROUND+ locations, with caching and failover handled for you." \
  "A content delivery network for teams that care about milliseconds. Global caching, instant purge, and clear analytics." \
  "Put your site behind a fast, resilient edge in minutes. Smart routing, managed TLS, and per-request insight." \
  "Low-latency delivery for websites and APIs, backed by an anycast network and automatic origin shielding.")
CTA1=$(pick "Get Started" "Start Free" "Create Account" "Try It Free")
CTA2=$(pick "View Status" "System Status" "Network Status")
TITLE_SUFFIX=$(pick "Content Delivery Network" "Edge Network" "Global CDN" "Edge Delivery Platform")
META_DESC=$(pick "provides fast, reliable content delivery with global edge nodes and low-latency caching." "is a global edge network for fast, secure websites and APIs." "delivers static and dynamic content from edge locations worldwide.")
H_STATUS=$(pick "System Status" "Service Health" "Platform Status" "Current Status")
H_FEATURES=$(pick "Why $BRAND_FULL" "What You Get" "Built for Speed" "Platform Features")
H_NETWORK=$(pick "Global Network" "Our Network" "Network at a Glance" "Edge Footprint")
H_NODE=$(pick "This Edge Node" "Serving Node" "Your Edge Node")
H_DOCS=$(pick "Quick Start" "Get Started in Minutes" "Developer Quick Start" "Configure Your Zone")
DOCS_LABEL=$(pick "Configure your origin" "Create a zone" "Add your site" "Point to your origin")

FEATURES=(
  "&#9889;~Sub-50ms Latency~Edge nodes in $LOCROUND+ locations keep your content close to your users."
  "&#128274;~TLS Everywhere~Automatic HTTPS with HTTP/2 and HTTP/3 support. Free managed certificates."
  "&#128200;~Real-Time Analytics~Monitor bandwidth, cache hit rates and request patterns from a single dashboard."
  "&#128736;~Edge Compute~Run custom logic at the edge with serverless workers. Transform, route and cache dynamically."
  "&#128737;~DDoS Protection~Always-on mitigation absorbs volumetric attacks before they reach your origin."
  "&#127760;~Anycast Routing~Every request is routed to the nearest healthy node, automatically."
  "&#9851;~Instant Purge~Invalidate cached files worldwide in under a second, from the dashboard or the API."
  "&#128190;~Origin Shield~A shielding tier collapses duplicate requests and cuts load on your servers."
  "&#127916;~Video Delivery~Adaptive streaming with segment caching tuned for HLS and DASH."
  "&#128295;~Simple API~Manage zones, rules and certificates programmatically with a clean REST API."
)
STATUSES=("Edge Network" "API Gateway" "Cache Layer" "DNS Resolution" "Dashboard" "Purge Service" "Analytics" "Origin Shield" "TLS Provisioning")
NAV=("#features~Features" "#network~Network" "#docs~Docs" "#status~Status")

work=$(mktemp -d); trap 'rm -rf "$work"' EXIT

: > "$work/features"
while IFS= read -r f; do
  IFS='~' read -r icon title desc <<< "$f"
  cat >> "$work/features" <<EOF
        <div class="feature">
          <div class="feature-icon">$icon</div>
          <h3>$title</h3>
          <p>$desc</p>
        </div>
EOF
done < <(shuffle "${FEATURES[@]}" | head -4)

: > "$work/status"
while IFS= read -r name; do
  cat >> "$work/status" <<EOF
        <div class="status-card">
          <div class="status-row">
            <span class="indicator online"></span>
            <span>$name</span>
          </div>
          <span class="status-label">Operational</span>
        </div>
EOF
done < <(shuffle "${STATUSES[@]}" | head -4)

: > "$work/nav"
while IFS= read -r n; do
  echo "        <a href=\"${n%%~*}\">${n#*~}</a>" >> "$work/nav"
done < <(shuffle "${NAV[@]}")

# Status, features and network in random order; docs always last.
: > "$work/main"
while IFS= read -r s; do cat "$T/sections/$s.html.tmpl" >> "$work/main"; echo >> "$work/main"; done < <(shuffle status features network)
cat "$T/sections/docs.html.tmpl" >> "$work/main"

# Replace a line consisting only of TOKEN with the contents of FILE.
splice() { awk -v tok="$2" -v f="$3" '$0 == tok { while ((getline l < f) > 0) print l; close(f); next } 1' "$1"; }

render() {
  sed -e "s|__BRAND1__|$B1|g" -e "s|__BRAND2__|$B2|g" -e "s|__BRAND__|$BRAND_FULL|g" \
      -e "s|__DOMAIN__|$SLUG.$TLD|g" -e "s|__APIVAR__|$APIVAR|g" -e "s|__VERSION__|$VERSION|g" \
      -e "s|__YEAR__|$YEAR|g" -e "s|__REGION__|$REGION|g" -e "s|__NODE__|$NODE|g" \
      -e "s|__LOCATIONS__|$LOCATIONS|g" -e "s|__LOCROUND__|$LOCROUND|g" \
      -e "s|__UPTIME__|$UPTIME|g" -e "s|__CAPACITY__|$CAPACITY|g" -e "s|__RPS__|$RPS|g" \
      -e "s|__HEADLINE__|$HEADLINE|g" -e "s|__TAGLINE__|$TAGLINE|g" -e "s|__CTA1__|$CTA1|g" -e "s|__CTA2__|$CTA2|g" \
      -e "s|__TITLE_SUFFIX__|$TITLE_SUFFIX|g" -e "s|__META_DESC__|$META_DESC|g" \
      -e "s|__H_STATUS__|$H_STATUS|g" -e "s|__H_FEATURES__|$H_FEATURES|g" -e "s|__H_NETWORK__|$H_NETWORK|g" \
      -e "s|__H_NODE__|$H_NODE|g" -e "s|__H_DOCS__|$H_DOCS|g" -e "s|__DOCS_LABEL__|$DOCS_LABEL|g" \
      -e "s|__ACCENT_HOVER__|$ACCENT_HOVER|g" -e "s|__ACCENT_DIM__|$ACCENT_DIM|g" -e "s|__ACCENT__|$ACCENT|g"
}

splice "$T/index.html.tmpl" __MAIN__ "$work/main" > "$work/page"
splice "$work/page" __STATUS_CARDS__ "$work/status" > "$work/page2"
splice "$work/page2" __FEATURE_CARDS__ "$work/features" > "$work/page3"
splice "$work/page3" __NAV_LINKS__ "$work/nav" | render > static/index.html
render < "$T/style.css.tmpl" > static/style.css
cp "$T/robots.txt" static/robots.txt

for f in static/index.html static/style.css; do
  if grep -q '__[A-Z0-9_]*__' "$f"; then echo "gen-decoy: unreplaced token in $f" >&2; exit 1; fi
done
echo "decoy site: $BRAND_FULL ($SLUG.$TLD), accent $ACCENT, \"$HEADLINE\""
