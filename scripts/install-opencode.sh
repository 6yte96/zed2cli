#!/bin/bash
#############################################
# Install the zed2cli OpenCode plugin for the current user.
#
# Detects the OpenCode major version and installs the matching plugin:
#   - OpenCode v2: a directory plugin under node_modules/opencode-zed-ai,
#     referenced from the "plugins" array in opencode.json.
#   - OpenCode v1: a single file plugin, referenced from the "plugin" array.
#
# Usage:
#   ./scripts/install-opencode.sh
#   ./scripts/install-opencode.sh --skip-config   # only copy files
#   OPENCODE_CONFIG_DIR=/custom/path ./scripts/install-opencode.sh
#############################################
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SKIP_CONFIG=0
[ "${1:-}" = "--skip-config" ] && SKIP_CONFIG=1

# Locate OpenCode's config dir: prefer an existing config, else the platform default.
detect_config_dir() {
    if [ -n "${XDG_CONFIG_HOME:-}" ] && [ -f "$XDG_CONFIG_HOME/opencode/opencode.json" ]; then
        echo "$XDG_CONFIG_HOME/opencode"
        return
    fi
    local linux="$HOME/.config/opencode"
    if [ -f "$linux/opencode.json" ]; then
        echo "$linux"
        return
    fi
    case "$(uname -s)" in
        Darwin)
            echo "$HOME/Library/Application Support/opencode"
            ;;
        MINGW*|MSYS*|CYGWIN*)
            echo "${APPDATA:-$HOME/AppData/Roaming}/opencode"
            ;;
        *)
            echo "$linux"
            ;;
    esac
}

CONFIG_DIR="${OPENCODE_CONFIG_DIR:-$(detect_config_dir)}"
PLUGIN_DIR="${OPENCODE_PLUGIN_DIR:-$CONFIG_DIR/node_modules/opencode-zed-ai}"

if ! command -v opencode >/dev/null 2>&1; then
    echo "[install] 'opencode' was not found on PATH."
    echo "  Install it first:  curl -fsSL https://opencode.ai/install | bash"
    echo "  (or re-run this script after installing)"
    exit 1
fi

OPENCODE_VERSION="$(opencode --version 2>/dev/null | head -1)"
OPENCODE_MAJOR="$(printf '%s' "$OPENCODE_VERSION" | sed -E 's/^[^0-9]*([0-9]+).*/\1/')"
[ -z "$OPENCODE_MAJOR" ] && OPENCODE_MAJOR=1
if [ "$OPENCODE_MAJOR" -ge 2 ]; then API="v2"; else API="v1"; fi
echo "[install] detected $OPENCODE_VERSION (plugin API $API)"

echo "[install] copying plugin to: $PLUGIN_DIR"
mkdir -p "$PLUGIN_DIR"
if [ "$API" = "v2" ]; then
    cp "$REPO_ROOT/src/index.mjs" "$PLUGIN_DIR/index.mjs"
else
    cp "$REPO_ROOT/src/index.v1.mjs" "$PLUGIN_DIR/index.mjs"
fi
cp "$REPO_ROOT/src/models.mjs" "$PLUGIN_DIR/models.mjs"
cp "$REPO_ROOT/src/package.json" "$PLUGIN_DIR/package.json"
[ -f "$REPO_ROOT/scripts/zed-token.sh" ] && cp "$REPO_ROOT/scripts/zed-token.sh" "$PLUGIN_DIR/zed-token.sh"

# What gets registered in opencode.json. V2 wants a plugin directory, V1 a file.
if [ "$API" = "v2" ]; then
    KEY="plugins"
    ENTRY="$PLUGIN_DIR"
else
    KEY="plugin"
    ENTRY="$PLUGIN_DIR/index.mjs"
fi

if [ "$SKIP_CONFIG" = "1" ]; then
    echo "[install] done (config skipped). Add this to your opencode.json manually:"
    echo "  \"$KEY\": [\"$ENTRY\"]"
    exit 0
fi

CONFIG_FILE="$CONFIG_DIR/opencode.json"
if [ ! -f "$CONFIG_FILE" ]; then
    mkdir -p "$CONFIG_DIR"
    cat > "$CONFIG_FILE" <<EOF
{
  "\$schema": "https://opencode.ai/config.json",
  "$KEY": ["$ENTRY"]
}
EOF
    echo "[install] created $CONFIG_FILE"
elif command -v jq >/dev/null 2>&1; then
    BACKUP="$CONFIG_FILE.backup-zed-ai.$(date +%s).$$"
    cp "$CONFIG_FILE" "$BACKUP"
    echo "[install] backup saved: $BACKUP"
    TMP_FILE="$(mktemp)"
    trap 'rm -f "$TMP_FILE"' EXIT
    if [ "$API" = "v2" ]; then
        # Add the directory to "plugins" and remove any stale V1 file entry.
        jq --arg entry "$ENTRY" '
            .plugins = (((.plugins // []) + [$entry]) | unique)
            | if .plugin then
                .plugin = [ .plugin[] | select((tostring | contains("opencode-zed-ai")) | not) ]
              else . end
            | if (.plugin? == []) then del(.plugin) else . end
        ' "$CONFIG_FILE" > "$TMP_FILE"
    else
        jq --arg entry "$ENTRY" '
            .plugin = (((.plugin // []) + [$entry]) | unique)
        ' "$CONFIG_FILE" > "$TMP_FILE"
    fi
    mv "$TMP_FILE" "$CONFIG_FILE"
    trap - EXIT
    echo "[install] updated $CONFIG_FILE"
else
    echo "[install] jq not found, add this to $CONFIG_FILE manually:"
    echo "  \"$KEY\": [\"$ENTRY\"]"
fi

echo ""
echo "[install] done. Next steps:"
if [ "$API" = "v2" ]; then
    echo "  1. Make sure a Zed token is available: run 'zed2cli token' (uses the Zed keyring)"
    echo "     or export ZED_TOKEN=eyJ...   (the plugin also reads ~/.zed_jwt_token)"
    echo "  2. opencode models  (look for zed-ai/... lines)"
    echo "  3. opencode run -m zed-ai/claude-sonnet-4-6 \"hello\""
else
    echo "  1. opencode providers login --provider zed-ai --method \"Login with Zed Session Token\""
    echo "     (or just: export ZED_TOKEN=eyJ...)"
    echo "  2. opencode models zed-ai"
    echo "  3. opencode run -m zed-ai/claude-sonnet-4-6 \"hello\""
fi
