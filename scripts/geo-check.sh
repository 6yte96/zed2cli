#!/bin/bash
#############################################
# geo-check.sh — is your network egress geo-blocked by Zed?
#
# Shows: your public IP + geolocation, token validity, and the
# Cloudflare edge (cf-ray datacenter code) your /completions
# request lands on, plus the verdict (blocked vs OK).
#############################################
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

TOKEN="${ZED_TOKEN:-}"
if [ -z "$TOKEN" ]; then
    TOKEN="$(bash "$SCRIPT_DIR/zed-token.sh" --raw 2>/dev/null)" || {
        echo "No token available. Set ZED_TOKEN or run scripts/zed-token.sh first." >&2
        exit 1
    }
fi

echo "=== 1. Public IP (what the internet sees) ==="
curl -s https://ipinfo.io/json | jq -r '"IP: \(.ip)   \(.city), \(.region), \(.country)   org: \(.org)"' 2>/dev/null \
    || curl -s https://ipinfo.io/ip
echo

echo "=== 2. Token validity (GET /models) ==="
curl -s -o /dev/null -w 'HTTP:%{http_code}  (200 = token OK; 401 = token expired)\n' \
    https://cloud.zed.dev/models -H "authorization: Bearer $TOKEN"
echo

echo "=== 3. Completions + Cloudflare edge datacenter (cf-ray) ==="
HDRS="/tmp/geo-hdrs.$$"
BODY="$(curl -s -w '\n%{http_code}' -D "$HDRS" 'https://cloud.zed.dev/completions' \
    -H "authorization: Bearer $TOKEN" \
    -H 'content-type: application/json' \
    -d '{"thread_id":"","prompt_id":"","intent":"user_prompt","provider":"anthropic","model":"claude-sonnet-4-6","provider_request":{"model":"claude-sonnet-4-6","max_tokens":8,"messages":[{"role":"user","content":[{"type":"text","text":"hi"}]}]}}')"
CODE="$(echo "$BODY" | tail -1)"
MSG="$(echo "$BODY" | sed '$d')"
CFRAY="$(grep -i '^cf-ray:' "$HDRS" 2>/dev/null | tr -d '\r' | awk '{print $2}')"
rm -f "$HDRS"
echo "cf-ray edge: ${CFRAY:-unknown}   HTTP: $CODE"
[ -n "$MSG" ] && echo "message: $MSG"
echo

if [ "$CODE" = "451" ]; then
    echo "=> BLOCKED: your network egress is geo-blocked by Zed (all providers)."
    echo "   Fix: run from a machine in another region, or use a VPN that exits"
    echo "   in the US/EU/SG/JP/AU/etc. Then re-run this script to confirm."
else
    echo "=> OK: completions are NOT geo-blocked from here."
fi
