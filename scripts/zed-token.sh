#!/bin/bash

#############################################
# Zed JWT Token Extractor
# Extracts the LLM JWT token from Zed's keyring
#############################################

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if required tools are installed. secret-tool is intentionally NOT
# required: the access-token-file / JWT-file paths (servers without Zed) work
# with just jq + curl. The keyring path checks for secret-tool itself.
check_dependencies() {
    local missing=()

    command -v jq >/dev/null 2>&1 || missing+=("jq")
    command -v curl >/dev/null 2>&1 || missing+=("curl")

    if [ ${#missing[@]} -ne 0 ]; then
        echo -e "${RED}Error: Missing required dependencies:${NC}"
        printf '  - %s\n' "${missing[@]}"
        echo ""
        echo "Install them with:"
        echo "  sudo apt install jq curl          # Debian/Ubuntu"
        echo "  sudo dnf install jq curl         # Fedora"
        echo "  (add libsecret-tools only if you use the keyring path)"
        exit 1
    fi
}

# Extract credentials from keyring
extract_credentials() {
    if ! command -v secret-tool >/dev/null 2>&1; then
        echo -e "${RED}Error: secret-tool not found (sudo apt install libsecret-tools).${NC}" >&2
        echo "  The keyring path needs it; use --export-access-token / --save-access-token" >&2
        echo "  or a saved JWT file on machines where Zed is not logged in." >&2
        exit 1
    fi
    echo -e "${BLUE}Extracting Zed credentials from system keyring...${NC}"

    # Get the secret (access token JSON)
    SECRET_JSON=$(secret-tool lookup url https://zed.dev 2>&1)
    if [ $? -ne 0 ] || [ -z "$SECRET_JSON" ]; then
        echo -e "${RED}Error: Could not find Zed credentials in keyring.${NC}"
        echo "Make sure you're signed in to Zed."
        exit 1
    fi

    # Get the user ID
    USER_ID=$(secret-tool search url https://zed.dev 2>&1 | grep "attribute.username" | awk '{print $3}')
    if [ -z "$USER_ID" ]; then
        echo -e "${RED}Error: Could not extract user ID from keyring.${NC}"
        exit 1
    fi

    echo -e "${GREEN}OK${NC} Found credentials for user ID: ${YELLOW}$USER_ID${NC}"
}

# Verify authentication with Zed API
verify_auth() {
    echo -e "${BLUE}Verifying authentication...${NC}"

    RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X GET "https://cloud.zed.dev/client/users/me" \
      -H "Authorization: $USER_ID $SECRET_JSON")

    HTTP_STATUS=$(echo "$RESPONSE" | grep "HTTP_STATUS:" | cut -d: -f2)
    BODY=$(echo "$RESPONSE" | sed '/HTTP_STATUS:/d')

    if [ "$HTTP_STATUS" != "200" ]; then
        echo -e "${RED}Error: Authentication failed (HTTP $HTTP_STATUS)${NC}"
        echo "Response: $BODY"
        echo ""
        echo "Your token may be expired. Try signing out and back in to Zed."
        exit 1
    fi

    GITHUB_LOGIN=$(echo "$BODY" | jq -r '.user.github_login' 2>/dev/null)
    echo -e "${GREEN}OK${NC} Authenticated as: ${YELLOW}$GITHUB_LOGIN${NC}"
}

# Request JWT token from Zed API
get_jwt_token() {
    echo -e "${BLUE}Requesting LLM JWT token...${NC}"

    JWT_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X POST "https://cloud.zed.dev/client/llm_tokens" \
      -H "Content-Type: application/json" \
      -H "Authorization: $USER_ID $SECRET_JSON" \
      -d '{}')

    HTTP_STATUS=$(echo "$JWT_RESPONSE" | grep "HTTP_STATUS:" | cut -d: -f2)
    BODY=$(echo "$JWT_RESPONSE" | sed '/HTTP_STATUS:/d')

    if [ "$HTTP_STATUS" != "200" ]; then
        echo -e "${RED}Error: Failed to get JWT token (HTTP $HTTP_STATUS)${NC}"
        echo "Response: $BODY"
        exit 1
    fi

    JWT_TOKEN=$(echo "$BODY" | jq -r '.token' 2>/dev/null)

    if [ -z "$JWT_TOKEN" ] || [ "$JWT_TOKEN" = "null" ]; then
        echo -e "${RED}Error: Could not parse JWT token from response${NC}"
        echo "Response: $BODY"
        exit 1
    fi

    echo -e "${GREEN}OK${NC} JWT token obtained successfully"
}

# Decode and display JWT information
decode_jwt() {
    echo ""
    echo -e "${BLUE}JWT Token Information:${NC}"
    echo "------------------------------------------------------"

    # Decode the payload (second part of JWT)
    PAYLOAD=$(echo "$JWT_TOKEN" | cut -d. -f2)
    # Add padding if needed
    PAYLOAD_PADDED=$(echo "$PAYLOAD" | awk '{while (length($0) % 4 != 0) $0 = $0 "="; print}')
    DECODED=$(echo "$PAYLOAD_PADDED" | base64 -d 2>/dev/null || echo "{}")

    if [ "$DECODED" != "{}" ]; then
        EXPIRY=$(echo "$DECODED" | jq -r '.exp' 2>/dev/null)
        if [ -n "$EXPIRY" ] && [ "$EXPIRY" != "null" ]; then
            EXPIRY_DATE=$(date -d @"$EXPIRY" 2>/dev/null || date -r "$EXPIRY" 2>/dev/null || echo "Unknown")
            echo -e "Expires: ${YELLOW}$EXPIRY_DATE${NC}"
        fi

        PLAN=$(echo "$DECODED" | jq -r '.plan' 2>/dev/null)
        if [ -n "$PLAN" ] && [ "$PLAN" != "null" ]; then
            echo -e "Plan: ${YELLOW}$PLAN${NC}"
        fi
    fi

    echo "------------------------------------------------------"
}

# Display the token
display_token() {
    echo ""
    echo -e "${GREEN}JWT token extracted${NC}"
    echo ""
    echo -e "${YELLOW}Bearer Token (for Authorization header):${NC}"
    echo "Bearer $JWT_TOKEN"
    echo ""
    echo -e "${YELLOW}Raw JWT Token:${NC}"
    echo "$JWT_TOKEN"
    echo ""

    # Offer to copy to clipboard if available
    if command -v xclip >/dev/null 2>&1; then
        echo -n "$JWT_TOKEN" | xclip -selection clipboard
        echo -e "${GREEN}OK${NC} Token copied to clipboard (using xclip)"
    elif command -v xsel >/dev/null 2>&1; then
        echo -n "$JWT_TOKEN" | xsel --clipboard
        echo -e "${GREEN}OK${NC} Token copied to clipboard (using xsel)"
    elif command -v wl-copy >/dev/null 2>&1; then
        echo -n "$JWT_TOKEN" | wl-copy
        echo -e "${GREEN}OK${NC} Token copied to clipboard (using wl-copy)"
    else
        echo -e "${YELLOW}Note: Install xclip, xsel, or wl-copy to auto-copy to clipboard${NC}"
    fi

    echo ""
    echo -e "${BLUE}OpenCode login:${NC}"
    echo "  opencode providers login --provider zed-ai"
    echo "  (single prompt — paste the JWT above where it asks for the API key)"
    echo ""
}

# Save token to file if requested
save_to_file() {
    if [ "$1" = "--save" ] || [ "$1" = "-s" ]; then
        OUTPUT_FILE="${2:-$HOME/.zed_jwt_token}"
        echo "$JWT_TOKEN" > "$OUTPUT_FILE"
        chmod 600 "$OUTPUT_FILE"
        echo -e "${GREEN}OK${NC} Token saved to: ${YELLOW}$OUTPUT_FILE${NC}"
        echo ""
    fi
}

# ---------------------------------------------------------------------------
# Long-lived access-token helpers (for servers where Zed is NOT logged in)
# ---------------------------------------------------------------------------

ACCESS_TOKEN_FILE="${ZED_ACCESS_TOKEN_FILE:-$HOME/.zed_access_token}"
JWT_FILE="${ZED_TOKEN_FILE:-${ZED_JWT_FILE:-$HOME/.zed_jwt_token}}"

# Read the long-lived access token + user id from the system keyring.
read_keyring() {
    SECRET_JSON=$(secret-tool lookup url https://zed.dev 2>/dev/null) || return 1
    [ -n "$SECRET_JSON" ] || return 1
    # NB: `secret-tool search` writes its output to stderr on some builds.
    USER_ID=$(secret-tool search url https://zed.dev 2>&1 | grep "attribute.username" | awk '{print $3}')
    [ -n "$USER_ID" ] || return 1
}

# Read "user_id <access token>" from the access-token file (manual entry).
read_access_token_file() {
    [ -f "$ACCESS_TOKEN_FILE" ] || return 1
    local line
    line=$(grep -v '^[[:space:]]*$' "$ACCESS_TOKEN_FILE" | head -1) || return 1
    [ -n "$line" ] || return 1
    USER_ID=$(echo "$line" | awk '{print $1}')
    SECRET_JSON=$(echo "$line" | awk '{$1=""; sub(/^ /,""); print}')
    [ -n "$USER_ID" ] && [ -n "$SECRET_JSON" ]
}

# Exchange an access token for a fresh 1-hour LLM JWT (prints the JWT).
exchange_for_jwt() {
    local user_id="$1" secret="$2" resp code token
    [ -n "$user_id" ] && [ -n "$secret" ] || return 1
    resp=$(curl -s -w '\n%{http_code}' -X POST "https://cloud.zed.dev/client/llm_tokens" \
        -H "Content-Type: application/json" \
        -H "Authorization: $user_id $secret" \
        -d '{}')
    code=$(echo "$resp" | tail -1)
    token=$(echo "$resp" | sed '$d' | jq -r '.token // ""' 2>/dev/null)
    [ "$code" = "200" ] && [ -n "$token" ] && [ "$token" != "null" ] && { printf '%s' "$token"; return 0; }
    return 1
}

# Resolve a raw JWT from ANY available source, best -> worst:
#   1. ZED_TOKEN env (static)
#   2. system keyring (Zed logged in here)        -> auto-refreshable
#   3. ~/.zed_access_token (manual entry on servers) -> auto-refreshable
#   4. ~/.zed_jwt_token (static JWT file)          -> expires in ~1h
# Prints the JWT to stdout; progress/status to stderr.
resolve_raw() {
    local tok=""
    if [ -n "${ZED_TOKEN:-}" ]; then
        tok=$(printf '%s' "$ZED_TOKEN" | sed -e 's/^Bearer[[:space:]]*//I' -e 's/[[:space:]]//g')
        if [ -n "$tok" ]; then
            echo "[token] source: ZED_TOKEN env (static, cannot auto-refresh)" >&2
            printf '%s' "$tok"; return 0
        fi
    fi
    if read_keyring; then
        if tok=$(exchange_for_jwt "$USER_ID" "$SECRET_JSON"); then
            echo "[token] source: keyring (auto-refresh OK)" >&2
            printf '%s' "$tok"; return 0
        fi
        echo "[token] WARN: keyring credentials found but token exchange failed" >&2
    fi
    if read_access_token_file; then
        if tok=$(exchange_for_jwt "$USER_ID" "$SECRET_JSON"); then
            echo "[token] source: $ACCESS_TOKEN_FILE (auto-refresh OK)" >&2
            printf '%s' "$tok"; return 0
        fi
        echo "[token] WARN: access-token file exchange failed" >&2
    fi
    if [ -f "$JWT_FILE" ]; then
        tok=$(grep -v '^[[:space:]]*$' "$JWT_FILE" | head -1 | sed -e 's/^Bearer[[:space:]]*//I' -e 's/[[:space:]]//g')
        if [ -n "$tok" ]; then
            echo "[token] source: $JWT_FILE (static — expires in ~1h; run scripts/zed-refresh-daemon.sh for auto-renewal)" >&2
            printf '%s' "$tok"; return 0
        fi
    fi
    return 1
}

# Store a pasted "user_id <access token>" line (manual setup on servers).
save_access_token() {
    local input="${1:--}" line
    if [ "$input" = "-" ]; then
        line=$(cat) || { echo -e "${RED}Error: failed reading stdin.${NC}" >&2; exit 1; }
    else
        line=$(cat "$input" 2>/dev/null) || {
            echo -e "${RED}Error: cannot read file: $input${NC}" >&2
            exit 1
        }
    fi
    line=$(echo "$line" | grep -v '^[[:space:]]*$' | head -1)
    [ -n "$line" ] || { echo -e "${RED}Error: no input provided (expected: user_id <access token>).${NC}" >&2; exit 1; }
    printf '%s\n' "$line" > "$ACCESS_TOKEN_FILE"
    chmod 600 "$ACCESS_TOKEN_FILE"
    echo -e "${GREEN}OK${NC} Access token saved to: ${YELLOW}$ACCESS_TOKEN_FILE${NC}" >&2
}

# Main function
main() {
    if [ "$RAW" = "1" ]; then
        # Raw mode: print ONLY the raw JWT on stdout (for scripting, e.g. the
        # bridge proxy / refresh daemon). Progress/status text is routed to
        # stderr so stdout stays machine-readable. Resolves from env, keyring,
        # access-token file, or JWT file — in that order.
        check_dependencies >&2
        local tok
        tok=$(resolve_raw) || {
            echo -e "${RED}[token] ERROR: no token source available.${NC}" >&2
            echo "  Sources tried: ZED_TOKEN env, keyring (Zed login), $ACCESS_TOKEN_FILE, $JWT_FILE" >&2
            exit 1
        }
        printf '%s' "$tok"
        exit 0
    fi

    echo ""
    echo -e "${BLUE}===========================================================${NC}"
    echo -e "${BLUE}          Zed LLM JWT Token Extractor v1.0${NC}"
    echo -e "${BLUE}===========================================================${NC}"
    echo ""

    check_dependencies
    extract_credentials
    verify_auth
    get_jwt_token
    decode_jwt
    display_token
    save_to_file "$@"

    echo -e "${GREEN}Done${NC}"
    echo ""
}

# Show usage
if [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
    echo "Zed JWT Token Extractor"
    echo ""
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -r, --raw              Print a raw JWT only (for scripting). Resolves from:"
    echo "                         ZED_TOKEN env -> keyring -> ~/.zed_access_token -> ~/.zed_jwt_token"
    echo "  -s, --save [FILE]      Save the current JWT to a file (default: ~/.zed_jwt_token)"
    echo "  -e, --export-access-token"
    echo "                         Print 'user_id <access token>' from the keyring (copy to"
    echo "                         another machine for manual setup; keeps auto-refresh working)"
    echo "      --save-access-token [FILE|-]"
    echo "                         Store a pasted 'user_id <access token>' line (default file:"
    echo "                         ~/.zed_access_token, chmod 600). Reads from stdin if '-'"
    echo "  -h, --help             Show this help message"
    echo ""
    echo "Description:"
    echo "  Extracts an LLM JWT for cloud.zed.dev from the currently signed-in Zed"
    echo "  session (keyring) or from a saved access token. JWTs last ~1 hour."
    echo "  Requires: jq, curl (secret-tool only for the keyring path)."
    echo ""
    echo "Examples:"
    echo "  $0                          # Extract and display token"
    echo "  $0 --raw                    # Print raw JWT only (proxy/daemon auto-refresh)"
    echo "  $0 --export-access-token    # Get a refreshable token for another machine"
    echo "  $0 --save-access-token -    # Paste that token here (stdin), keeps refreshing"
    echo "  $0 --save                   # Save current JWT to ~/.zed_jwt_token"
    echo ""
    exit 0
fi

# ---------------------------------------------------------------------------
# Subcommands
# ---------------------------------------------------------------------------
case "$1" in
  --export-access-token|-e)
      check_dependencies >&2
      if ! read_keyring; then
          echo -e "${RED}Error: not signed in to Zed (no keyring credentials).${NC}" >&2
          exit 1
      fi
      printf '%s %s\n' "$USER_ID" "$SECRET_JSON"
      echo -e "${GREEN}OK${NC} Copy this line to the target machine, then there run:" >&2
      echo "  $0 --save-access-token -" >&2
      exit 0
      ;;
  --save-access-token)
      # no dependencies needed — just writes a chmod-600 file
      save_access_token "${2:--}"
      exit 0
      ;;
esac

# Parse --raw flag (can be combined with other options)
RAW=0
for _arg in "$@"; do
    case "$_arg" in
        --raw|-r) RAW=1 ;;
    esac
done

# Run main function
main "$@"
