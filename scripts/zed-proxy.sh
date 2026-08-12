#!/bin/bash
#############################################
# zed-open bridge proxy launcher
# Fetches a fresh Zed LLM JWT (env or keyring) and starts the
# OpenAI-compatible bridge proxy with automatic token refresh.
#############################################

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
TOKEN_SCRIPT="$SCRIPT_DIR/zed-token.sh"

# 1. Make sure we have a token
if [ -z "${ZED_TOKEN:-}" ]; then
    if command -v secret-tool >/dev/null 2>&1 && bash "$TOKEN_SCRIPT" --raw >/dev/null 2>&1; then
        ZED_TOKEN="$(bash "$TOKEN_SCRIPT" --raw 2>/dev/null)"
        export ZED_TOKEN
        echo "[zed-proxy] token fetched from Zed keyring (fresh JWT)"
    else
        echo "[zed-proxy] ERROR: ZED_TOKEN is not set and no keyring token is available." >&2
        echo "[zed-proxy] Set it manually, e.g.:" >&2
        echo "  $TOKEN_SCRIPT --save && export ZED_TOKEN=\$(cat ~/.zed_jwt_token)" >&2
        echo "  # or:  export ZED_TOKEN=\$(bash $TOKEN_SCRIPT --raw)" >&2
        exit 1
    fi
fi

# 2. Start the proxy. Pass --token-script so it re-fetches a fresh JWT
#    automatically when the current one expires (Zed JWTs last ~1 hour).
exec node "$ROOT_DIR/src/proxy.mjs" \
    --token-script "bash $TOKEN_SCRIPT --raw" \
    "$@"
