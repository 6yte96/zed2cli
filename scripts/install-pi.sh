#!/bin/bash
#############################################
# Install the zed2cli pi extension.
#
# Registers a `zed-ai` provider with pi, pointing at the local
# bridge proxy (start it first: ./scripts/zed-proxy.sh).
#
# Usage:
#   ./scripts/install-pi.sh
#############################################
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
EXT="$REPO_ROOT/src/pi/zed-ai.mjs"

if ! command -v pi >/dev/null 2>&1; then
    echo "[install] 'pi' was not found on PATH."
    echo "  Install it first:"
    echo "    curl -fsSL https://pi.dev/install | bash"
    echo "    # or:  bun install -g @earendil-works/pi-coding-agent"
    exit 1
fi

# Register the current extension and drop any earlier zed-ai entry (for example
# one left over from the old zed-open path, whose file no longer exists).
SETTINGS="${PI_SETTINGS:-$HOME/.pi/agent/settings.json}"
if [ -f "$SETTINGS" ] && command -v jq >/dev/null 2>&1; then
    TMP="$(mktemp)"
    trap 'rm -f "$TMP"' EXIT
    jq --arg ext "$EXT" '
        .packages = (((.packages // []) | map(select((tostring | test("zed-ai\\.mjs$")) | not))) + [$ext])
    ' "$SETTINGS" > "$TMP"
    mv "$TMP" "$SETTINGS"
    trap - EXIT
    echo "[install] registered $EXT in $SETTINGS"
else
    pi install "$EXT"
fi

echo ""
echo "[install] done. Remember:"
echo "  1. Start the bridge first:  zed2cli proxy   (or ./scripts/zed-proxy.sh)"
echo "  2. Verify:                  pi --list-models | grep zed-ai"
echo "  3. Use:                     pi --provider zed-ai --model zed-ai/claude-sonnet-4-6 \"hello\""
