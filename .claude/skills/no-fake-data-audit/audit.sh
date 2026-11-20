#!/usr/bin/env bash
# Flags likely fabricated operational data in production code. Exit 1 if any un-allowed hit.
set -uo pipefail
ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
cd "$ROOT"

PATHS=()
for p in backend/app frontend/src; do [ -d "$p" ] && PATHS+=("$p"); done
[ ${#PATHS[@]} -eq 0 ] && { echo "no source dirs found"; exit 0; }

EXCL=(--exclude-dir=tests --exclude-dir=__tests__ --exclude-dir=fixtures --exclude-dir=node_modules
      --exclude-dir=dist --exclude-dir=build --exclude-dir=lab --exclude='*.test.*' --exclude='*.spec.*'
      --exclude='*.stories.*' --exclude='*.md')

PATTERNS=(
  '(^|[^0-9.])(10|172\.(1[6-9]|2[0-9]|3[01])|192\.168)\.[0-9]{1,3}\.[0-9]{1,3}([^0-9]|$)'  # private IPs
  '([0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}'                                      # MAC addresses
  'Math\.random\('                                                          # random "stats"
  '(faker|Faker|@faker-js)'                                             # faker in prod
  '(mock|dummy|fake|sample)(Data|Assets|Alerts|Threats|Devices|Stats|Hosts)'
  'CVE-[0-9]{4}-[0-9]{4,}'                                                  # hard-coded CVEs
  '(threatsBlocked|uptime|attacksPrevented)[[:space:]]*[:=][[:space:]]*[0-9]'                 # invented counters
)

hits=0
for pat in "${PATTERNS[@]}"; do
  out=$(grep -rnE "${EXCL[@]}" "$pat" "${PATHS[@]}" 2>/dev/null | grep -v 'cgx-allow' || true)
  if [ -n "$out" ]; then echo "--- pattern: $pat"; echo "$out"; hits=$((hits + $(echo "$out" | wc -l))); fi
done

echo
if [ $hits -eq 0 ]; then echo "no-fake-data-audit: CLEAN"; exit 0
else echo "no-fake-data-audit: $hits hit(s) — fix or annotate with 'cgx-allow: <reason>'"; exit 1; fi
