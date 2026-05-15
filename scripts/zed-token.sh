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

# Check if required tools are installed
check_dependencies() {
    local missing=()

    command -v secret-tool >/dev/null 2>&1 || missing+=("secret-tool (install libsecret-tools)")
    command -v jq >/dev/null 2>&1 || missing+=("jq")
    command -v curl >/dev/null 2>&1 || missing+=("curl")

    if [ ${#missing[@]} -ne 0 ]; then
        echo -e "${RED}Error: Missing required dependencies:${NC}"
        printf '  - %s\n' "${missing[@]}"
        echo ""
        echo "Install them with:"
        echo "  sudo apt install libsecret-tools jq curl  # Debian/Ubuntu"
        echo "  sudo dnf install libsecret jq curl        # Fedora"
        exit 1
    fi
}

# Extract credentials from keyring
extract_credentials() {
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
    echo "  opencode providers login --provider zed-ai --method \"Login with Zed Session Token\""
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

# Main function
main() {
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
    echo "  -s, --save [FILE]    Save token to file (default: ~/.zed_jwt_token)"
    echo "  -h, --help           Show this help message"
    echo ""
    echo "Description:"
    echo "  Extracts the LLM JWT token from Zed's system keyring for the"
    echo "  currently signed-in local user."
    echo "  Requires: secret-tool, jq, curl"
    echo ""
    echo "Examples:"
    echo "  $0                          # Extract and display token"
    echo "  $0 --save                   # Extract and save to ~/.zed_jwt_token"
    echo "  $0 --save /tmp/token.txt    # Extract and save to custom file"
    echo ""
    exit 0
fi

# Run main function
main "$@"
