# zed2cli

Use **Zed-hosted AI models** from your terminal coding agents — **OpenCode**, **pi**, **Hermes**, or any OpenAI-compatible CLI — through your Zed subscription, without running Zed.

This is an unofficial bridge. It is not affiliated with Zed, Anthropic, OpenAI, Google, xAI, or OpenCode.

## Install

```bash
npm install -g zed2cli          # or:  bun add -g zed2cli
```

Or run it on the fly without installing anything:

```bash
npx zed2cli geo-check           # or:  bunx zed2cli doctor
```

> **New here? Follow [`INSTALL.md`](INSTALL.md)** — the step-by-step install runbook for OpenCode, pi, Hermes, and any OpenAI-compatible CLI.

## Commands

```bash
zed2cli install-opencode        # install the opencode plugin (no proxy needed)
zed2cli install-pi              # register the zed-ai provider with pi
zed2cli proxy                   # start the OpenAI-compatible bridge proxy
zed2cli token --raw             # print a fresh JWT (or --export-access-token / --save-access-token)
zed2cli daemon install          # auto-refresh the JWT every ~50 min (systemd)
zed2cli geo-check               # diagnose geo-blocking (egress IP + cf-ray edge)
zed2cli doctor                  # environment + token + network diagnostic
zed2cli help                    # full usage
```

## How it works

Zed exposes a proprietary endpoint, `POST https://cloud.zed.dev/completions`, authenticated with a short-lived JWT from your Zed account. It speaks neither OpenAI nor Anthropic natively — it wraps the provider request in a `provider_request` envelope and streams back NDJSON events.

zed2cli bridges that protocol two ways:

| Agent | Bridge | How |
|-------|--------|-----|
| **OpenCode** (preferred) | Plugin (`src/index.mjs`) | Registers a `zed-ai` provider (as an `@ai-sdk/openai-compatible` provider with a custom `fetch`); translates OpenAI ⇄ Zed in-process. No proxy needed. Works on OpenCode 1.18. |
| **pi** (preferred) | Extension + proxy | `src/pi/zed-ai.mjs` registers a `zed-ai` provider pointing at the local OpenAI-compatible bridge (`src/proxy.mjs`). |
| **Hermes** | Proxy only | Point Hermes at `http://127.0.0.1:8787/v1` (see `config/hermes/zed-ai.yaml`). |
| **Anything OpenAI-compatible** | Proxy only | `src/proxy.mjs` speaks `/v1/chat/completions` + `/v1/models`. |

```
┌────────────┐   OpenAI API    ┌─────────────────────┐   Zed envelope + NDJSON   ┌────────────────────┐
│ opencode   │◄───────────────►│  zed2cli bridge     │◄─────────────────────────►│ cloud.zed.dev      │
│ pi         │   /v1/chat/…    │  src/proxy.mjs      │   provider_request         │ /completions       │
│ hermes     │   /v1/models    │  (or opencode       │                            │ (Zed subscription) │
│ any CLI    │                 │   plugin, in-proc)  │                            │                    │
└────────────┘                 └─────────────────────┘                            └────────────────────┘
```

## Authenticate

Zed JWTs are short-lived (~1 hour). Get a fresh one three ways:

1. **Keyring (best)** — if you're signed in to Zed on this machine:
   ```bash
   zed2cli token            # shows token + info
   zed2cli token --raw      # raw JWT only (for scripting)
   zed2cli token --save     # saves to ~/.zed_jwt_token (chmod 600)
   ```
   Needs `libsecret-tools jq curl` (`sudo apt install libsecret-tools jq curl`).
2. **Paste a token you captured** from a request Zed makes to `cloud.zed.dev` (any `Bearer eyJ…`).
3. **Env var** — `export ZED_TOKEN=eyJ…`.

Keep tokens private. Never commit them.

## Auto-refresh (no more hourly pasting)

Zed JWTs last ~1 hour. Run the refresh daemon once and it keeps `~/.zed_jwt_token` fresh in the background — the opencode plugin, the proxy, and every command read it automatically:

```bash
zed2cli daemon start     # background loop (every ~50 min)
zed2cli daemon install   # or: systemd user service (auto-start at login)
zed2cli daemon status    # PID + current expiry
```

On a machine where Zed is **not** logged in, do this once (the long-lived access token keeps refreshing forever):

```bash
# machine where Zed IS logged in:
zed2cli token --export-access-token     # prints: 571580 {"version":2,…}

# on the server (paste the printed line):
zed2cli token --save-access-token -     # stores ~/.zed_access_token
zed2cli daemon install
```

Everything downstream picks the fresh file up automatically: the opencode plugin falls back to `~/.zed_jwt_token` (or `ZED_TOKEN_FILE`), and the proxy re-reads `--token-file` on expiry (or `--token-script "zed2cli token --raw"` resolves from any source).

> Note: a pasted **JWT** (`~/.zed_jwt_token`) still expires in ~1 h and cannot self-refresh — only the keyring or a saved access token can mint fresh ones. That's exactly what the daemon uses, so manual JWT entry is only a fallback.

## Quick start — OpenCode (plugin, no proxy)

```bash
zed2cli install-opencode
opencode providers login --provider zed-ai
#   single prompt — paste your eyJ… JWT where it asks for the API key
opencode models zed-ai                # expect 16 models
opencode run -m zed-ai/claude-sonnet-4-6 "hello"
```

## Quick start — pi (extension + proxy)

```bash
zed2cli proxy              # bridge proxy on http://127.0.0.1:8787/v1
zed2cli install-pi         # registers the zed-ai provider
pi --list-models | grep zed-ai
pi --provider zed-ai --model zed-ai/claude-sonnet-4-6 "hello"
```

## Models

Registered models (Student plan, from `GET https://cloud.zed.dev/models`):

```text
anthropic  claude-sonnet-5, claude-sonnet-4-6, claude-sonnet-4-5, claude-haiku-4-5
open_ai    gpt-5.6-sol, gpt-5.6-terra, gpt-5.6-luna, gpt-5.5, gpt-5.4,
           gpt-5.3-codex, gpt-5.2, gpt-5-mini, gpt-5-nano
google     gemini-3.1-pro-preview, gemini-3.5-flash, gemini-3-flash
```

If your plan differs, refresh the catalog and update `src/models.mjs` (and the inline list in `src/pi/zed-ai.mjs`):

```bash
curl -s https://cloud.zed.dev/models -H "authorization: Bearer $ZED_TOKEN" | jq '.models[].id'
```

## Troubleshooting

| Symptom | Cause / fix |
|---------|-------------|
| `401 Unauthorized` | JWT expired (~1 h) or wrong. Re-run `zed2cli token` (or the daemon/proxy refresh automatically). |
| `451 Access to … not available from this data center` | Geo-blocked network egress — affects **all** providers (Anthropic/OpenAI/Google). The block is keyed on the Cloudflare edge your request lands on (`cf-ray`), so no header/code change helps — the *egress* must move. Fixes: run on a machine in an allowed region, use a VPN exiting in the US/EU/SG/JP/AU, or route via a **Tailscale exit node** on an allowed-region machine (`sudo tailscale set --advertise-exit-node` on it, then `sudo tailscale set --exit-node=<ip>` here). Diagnose with `zed2cli geo-check`. |
| HTTP 500 with `provider: openai` | Wrong provider name — must be `open_ai`. (Fixed in this repo.) |
| Model not found | ID drift (e.g. `gpt-5-5` vs `gpt-5.5`). Refresh from `/models`. |
| OpenAI models 400/500 | Use the catalog IDs with dots and `open_ai` provider. |

## Verified against the live endpoint (2026-08-12)

- `GET https://cloud.zed.dev/models` with a Student-plan JWT returns the exact model catalog (16 models). **This is the authoritative source** — the previous hardcoded list was wrong: OpenAI model IDs use dots (`gpt-5.5`, not `gpt-5-5`) and the provider key is `open_ai` (underscore). Sending `provider: "openai"` yields HTTP 500.
- A minimal `/completions` request with the correct envelope is accepted and routed to the provider.
- The streaming translation (text deltas, tool calls, usage, `[DONE]`) was verified by replaying a captured trace through the bridge.
- **Geo restriction:** from a datacenter in Hong Kong (HKG), Zed returns HTTP 451 for every provider. The token itself is valid (`/models` returns 200). If you see 451, run `zed2cli geo-check` and move egress to an allowed region.

## Known limitations

- `tool_choice` is not forwarded (tools are always offered); reasoning/thinking deltas from models like Claude Sonnet 5 are not surfaced as separate reasoning blocks.
- Remote (non-data-URI) image URLs are skipped; paste images as base64 data URIs.
- The tooling shells out to bash (Linux/macOS); on Windows use WSL or Git Bash.

## Files

```text
cli.mjs                   CLI dispatcher (bin: zed2cli)
src/models.mjs            Verified model catalog + helpers (shared)
src/index.mjs             OpenCode plugin (provider "zed-ai")
src/proxy.mjs             OpenAI-compatible bridge proxy
src/pi/zed-ai.mjs         pi extension (provider "zed-ai")
config/opencode.json.example   OpenCode config sample
config/hermes/zed-ai.yaml      Hermes config sample
scripts/zed-token.sh      Unified JWT resolver (keyring / access token / file) + export/save
scripts/zed-refresh-daemon.sh  Hourly JWT refresher (nohup or systemd user service)
scripts/zed-proxy.sh      Bridge launcher with token auto-refresh
scripts/geo-check.sh      Diagnose geo-blocking (egress IP + cf-ray edge)
scripts/install-opencode.sh    One-command OpenCode plugin installer
scripts/install-pi.sh          One-command pi extension installer
.github/workflows/publish.yml  Publish to npm on v* tags
```
