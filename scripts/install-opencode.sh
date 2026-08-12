#!/bin/bash
#############################################
# Install the zed-open OpenCode plugin for the current user.
#
# - copies the plugin files into the OpenCode plugin directory
# - adds the plugin to opencode.json (with a timestamped backup)
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

echo "[install] copying plugin to: $PLUGIN_DIR"
mkdir -p "$PLUGIN_DIR"
cp "$REPO_ROOT/src/index.mjs" "$REPO_ROOT/src/models.mjs" "$REPO_ROOT/src/package.json" "$PLUGIN_DIR/"

if [ "$SKIP_CONFIG" = "1" ]; then
    echo "[install] done (config skipped). Add this to your opencode.json manually:"
    echo "  \"plugin\": [\"$PLUGIN_DIR/index.mjs\"]"
    exit 0
fi

CONFIG_FILE="$CONFIG_DIR/opencode.json"
if [ ! -f "$CONFIG_FILE" ]; then
    mkdir -p "$CONFIG_DIR"
    cat > "$CONFIG_FILE" <<EOF
{
  "\$schema": "https://opencode.ai/config.json",
  "plugin": ["$PLUGIN_DIR/index.mjs"]
}
EOF
    echo "[install] created $CONFIG_FILE"
else
    BACKUP="$CONFIG_FILE.backup-zed-open.$(date +%s).$$"
    cp "$CONFIG_FILE" "$BACKUP"
    echo "[install] backup saved: $BACKUP"
    if command -v jq >/dev/null 2>&1; then
        TMP_FILE="$(mktemp)"
        trap 'rm -f "$TMP_FILE"' EXIT
        jq --arg p "$PLUGIN_DIR/index.mjs" '
            if (((.plugin // []) | type) == "array" and (.plugin | index($p))) then .
            else .plugin = ((.plugin // []) + [$p])
            end
        ' "$CONFIG_FILE" > "$TMP_FILE"
        mv "$TMP_FILE" "$CONFIG_FILE"
        trap - EXIT
        echo "[install] updated $CONFIG_FILE"
    else
        echo "[install] jq not found — add this to $CONFIG_FILE manually:"
        echo "  \"plugin\": [\"$PLUGIN_DIR/index.mjs\"]"
    fi
fi

echo ""
echo "[install] done. Next steps:"
echo "  1. opencode providers login --provider zed-ai --method \"Login with Zed Session Token\""
echo "     (or just: export ZED_TOKEN=eyJ...)"
echo "  2. opencode models zed-ai"
echo "  3. opencode run -m zed-ai/claude-sonnet-4-6 \"hello\""
