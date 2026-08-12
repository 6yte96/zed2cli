#!/bin/bash
#############################################
# zed-open JWT refresh daemon
#
# Keeps ~/.zed_jwt_token topped up with a fresh 1-hour Zed JWT so nothing
# (opencode plugin, proxy, scripts) ever needs a manual login. Resolves the
# JWT through scripts/zed-token.sh --raw, which tries, in order:
#   ZED_TOKEN env -> keyring (Zed logged in here) -> ~/.zed_access_token
#   (manual entry on servers) -> ~/.zed_jwt_token (static, last resort)
#
# Usage:
#   scripts/zed-refresh-daemon.sh start     # run in background (nohup)
#   scripts/zed-refresh-daemon.sh stop      # stop the background daemon
#   scripts/zed-refresh-daemon.sh status    # PID, last refresh, expiry
#   scripts/zed-refresh-daemon.sh install   # systemd user service (auto-start)
#   scripts/zed-refresh-daemon.sh uninstall # remove the systemd service
#
# Env overrides:
#   ZED_REFRESH_INTERVAL  seconds between refreshes (default: 3000 = 50 min;
#                          the JWT lives 3600 s)
#   ZED_JWT_FILE          output file (default: ~/.zed_jwt_token)
#   ZED_REFRESH_STATE_DIR pid/log directory (default: ~/.local/state/zed-refresh)
#############################################
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TOKEN_SCRIPT="$SCRIPT_DIR/zed-token.sh"
STATE_DIR="${ZED_REFRESH_STATE_DIR:-$HOME/.local/state/zed-refresh}"
PID_FILE="$STATE_DIR/zed-refresh.pid"
LOG_FILE="$STATE_DIR/zed-refresh.log"
JWT_FILE="${ZED_JWT_FILE:-$HOME/.zed_jwt_token}"
INTERVAL="${ZED_REFRESH_INTERVAL:-3000}"
SERVICE_NAME="zed-token-refresh"
SYSTEMD_UNIT="$HOME/.config/systemd/user/$SERVICE_NAME.service"

mkdir -p "$STATE_DIR"

log() { echo "$(date '+%Y-%m-%d %H:%M:%S') $*" >> "$LOG_FILE"; }

# Decode the exp timestamp (epoch) from a JWT payload.
jwt_expiry() {
    local token="$1" payload
    payload=$(echo "$token" | cut -d. -f2 | tr '_-' '/+' | awk '{while (length($0) % 4 != 0) $0 = $0 "="; print}')
    echo "$payload" | base64 -d 2>/dev/null | jq -r '.exp // 0' 2>/dev/null
}

refresh_once() {
    local tok exp now
    tok=$(bash "$TOKEN_SCRIPT" --raw 2>>"$LOG_FILE") || return 1
    [ -n "$tok" ] || return 1
    tmp="${JWT_FILE}.tmp.$$"
    printf '%s' "$tok" > "$tmp"
    chmod 600 "$tmp"
    mv -f "$tmp" "$JWT_FILE"
    exp=$(jwt_expiry "$tok")
    now=$(date +%s)
    if [ -n "$exp" ] && [ "$exp" -gt 0 ] 2>/dev/null; then
        log "refreshed JWT -> $JWT_FILE (expires $(date -d @"$exp" '+%Y-%m-%d %H:%M:%S' 2>/dev/null || echo "epoch $exp"))"
        if [ "$exp" -le $((now + 120)) ]; then
            log "WARNING: resolved token is static/expiring — no refreshable source"
            log "  (keyring or ~/.zed_access_token). Set one up for auto-renewal."
        fi
    else
        log "refreshed JWT -> $JWT_FILE (static / expiry unknown — cannot auto-renew)"
    fi
    return 0
}

loop() {
    log "daemon started (interval ${INTERVAL}s, jwt file $JWT_FILE)"
    while true; do
        if ! refresh_once; then
            log "ERROR: token resolution failed — check scripts/zed-token.sh --raw"
        fi
        sleep "$INTERVAL"
    done
}

start_daemon() {
    if [ -f "$PID_FILE" ] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
        echo "daemon already running (pid $(cat "$PID_FILE"))"
        return 0
    fi
    nohup bash "$0" --_loop >>"$LOG_FILE" 2>&1 &
    echo $! > "$PID_FILE"
    sleep 1
    if kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
        echo "daemon started (pid $(cat "$PID_FILE"), logs: $LOG_FILE)"
        # refresh immediately so the file is fresh right away
        refresh_once
    else
        echo "ERROR: daemon failed to start; see $LOG_FILE"
        return 1
    fi
}

stop_daemon() {
    if [ -f "$PID_FILE" ] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
        kill "$(cat "$PID_FILE")" 2>/dev/null || true
        echo "daemon stopped"
    else
        echo "daemon not running"
    fi
    rm -f "$PID_FILE"
}

status_daemon() {
    if [ -f "$PID_FILE" ] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
        echo "status: RUNNING (pid $(cat "$PID_FILE"))"
    elif command -v systemctl >/dev/null 2>&1 && systemctl --user is-active "$SERVICE_NAME" >/dev/null 2>&1; then
        echo "status: RUNNING (systemd user service $SERVICE_NAME)"
    else
        echo "status: NOT running"
    fi
    if [ -f "$JWT_FILE" ]; then
        tok=$(head -1 "$JWT_FILE")
        exp=$(jwt_expiry "$tok")
        now=$(date +%s)
        if [ -n "$exp" ] && [ "$exp" -gt 0 ] 2>/dev/null; then
            echo "jwt file: $JWT_FILE (expires $(date -d @"$exp" '+%H:%M:%S' 2>/dev/null), $((exp - now))s left)"
        else
            echo "jwt file: $JWT_FILE (unparseable)"
        fi
    else
        echo "jwt file: $JWT_FILE (missing)"
    fi
    echo "log: $LOG_FILE"
}

install_systemd() {
    mkdir -p "$HOME/.config/systemd/user"
    cat > "$SYSTEMD_UNIT" <<EOF
[Unit]
Description=zed-open JWT refresh daemon
After=network-online.target

[Service]
Type=simple
ExecStart=/bin/bash "$SCRIPT_DIR/zed-refresh-daemon.sh" --foreground
Restart=on-failure
RestartSec=10
Environment=ZED_REFRESH_STATE_DIR=$STATE_DIR
Environment=ZED_JWT_FILE=$JWT_FILE
Environment=ZED_REFRESH_INTERVAL=$INTERVAL

[Install]
WantedBy=default.target
EOF
    systemctl --user daemon-reload
    systemctl --user enable --now "$SERVICE_NAME"
    echo "systemd user service installed + started: $SYSTEMD_UNIT"
    echo "  status:  systemctl --user status $SERVICE_NAME"
    echo "  logs:    journalctl --user -u $SERVICE_NAME -f"
}

uninstall_systemd() {
    systemctl --user disable --now "$SERVICE_NAME" 2>/dev/null || true
    rm -f "$SYSTEMD_UNIT"
    systemctl --user daemon-reload
    echo "systemd user service removed"
}

case "${1:-}" in
  start) start_daemon ;;
  stop)  stop_daemon ;;
  restart) stop_daemon; start_daemon ;;
  status) status_daemon ;;
  install) install_systemd ;;
  uninstall) uninstall_systemd ;;
  --_loop) loop ;;
  --_refresh_once) refresh_once ;;
  --foreground) loop ;;   # used by the systemd user service
  *)
      echo "Usage: $0 {start|stop|restart|status|install|uninstall}"
      echo ""
      echo "  start       run in background (nohup) — writes fresh JWT to $JWT_FILE"
      echo "  stop        stop the background daemon"
      echo "  status      PID, last refresh, current expiry"
      echo "  install     install a systemd USER service (auto-start at login)"
      echo "  uninstall   remove the systemd service"
      exit 1
      ;;
esac
