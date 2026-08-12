#!/bin/bash
#############################################
# Install the zed-open pi extension.
#
# Registers a `zed-ai` provider with pi, pointing at the local
# bridge proxy (start it first: ./scripts/zed-proxy.sh).
#
# Usage:
#   ./scripts/install-pi.sh
#############################################
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if ! command -v pi >/dev/null 2>&1; then
    echo "[install] 'pi' was not found on PATH."
    echo "  Install it first:"
    echo "    curl -fsSL https://pi.dev/install | bash"
    echo "    # or:  bun install -g @earendil-works/pi-coding-agent"
    exit 1
fi

pi install "$REPO_ROOT/src/pi/zed-ai.mjs"

echo ""
echo "[install] done. Remember:"
echo "  1. Start the bridge first:  ./scripts/zed-proxy.sh"
echo "  2. Verify:                  pi --list-models | grep zed-ai"
echo "  3. Use:                     pi --provider zed-ai --model zed-ai/claude-sonnet-4-6 \"hello\""
