# Installing zed2cli

This guide is for **anyone** using Zed-hosted models from their own machine via
the `zed2cli` npm package. It covers OpenCode, pi, Hermes, and any
OpenAI-compatible CLI. (The README describes the project in depth; this page is
the install runbook.)

## 0. What you need

- A **Zed account on a plan that includes AI models** (verified against the
  Zed Student plan; other plans may expose a different model list).
- **Node.js ≥ 18** and **bash** (Linux/macOS; on Windows use WSL or Git Bash).
- At least one CLI agent: **OpenCode** (`curl -fsSL https://opencode.ai/install | bash`)
  and/or **pi** (`curl -fsSL https://pi.dev/install | bash`) and/or anything
  that speaks the OpenAI API.
- Optional: `libsecret-tools` (`secret-tool`) so zed2cli can pull fresh Zed
  tokens from your system keyring automatically.

```bash
sudo apt install libsecret-tools jq curl   # Debian/Ubuntu
sudo dnf install libsecret jq curl         # Fedora
```

## 1. Install the package

```bash
npm install -g zed2cli          # or:  bun add -g zed2cli
zed2cli --version               # sanity check
```

Or run commands on the fly without installing (each one downloads on demand):

```bash
npx zed2cli geo-check
bunx zed2cli doctor
```

> Cloning the repo instead? Same commands work: `git clone … && cd zed2cli` then
> `node cli.mjs` behaves exactly like `zed2cli`.

## 2. Get a Zed token

Zed JWTs are short-lived (~1 hour). Choose one:

**A. From your keyring** (you're signed in to Zed on this machine):

```bash
zed2cli token            # shows token + info
zed2cli token --raw      # raw JWT only (for scripting)
```

> The keyring helper uses `secret-tool` (libsecret) and is **Linux-only**. On
> macOS/Windows use option B.

**B. Capture it from Zed itself** — open Zed, make any AI request, and copy the
`Authorization: Bearer eyJ…` header from a request to `cloud.zed.dev`. Paste
the `eyJ…` part.

**C. Env var** — `export ZED_TOKEN=eyJ…`.

**D. Access token for another machine** — on the machine where Zed is logged
in, print the long-lived access token once:

```bash
zed2cli token --export-access-token    # prints: 571580 {"version":2,…}
```

Then on the server (see §5) paste that line: `zed2cli token --save-access-token -`.
The daemon uses it to keep minting fresh JWTs forever — no re-pasting needed.

Keep tokens private; they grant access to your Zed plan. Never commit them.

## 3. OpenCode (plugin — no proxy needed)

The plugin translates requests in-process, so OpenCode needs nothing else running.

```bash
zed2cli install-opencode
```

That copies the plugin into `~/.config/opencode/node_modules/opencode-zed-ai/`
and adds it to `~/.config/opencode/opencode.json` (backing up the file first;
needs `jq` — if `jq` is missing it prints the one line to add manually).

Then authenticate and verify:

```bash
opencode providers login --provider zed-ai
# single prompt — paste your eyJ… JWT where it asks for the API key

opencode models zed-ai                          # expect 16 models
opencode run -m zed-ai/claude-sonnet-4-6 "hello"
```

Don't want to paste tokens? `export ZED_TOKEN=eyJ…` works as a fallback.

## 4. pi (extension + bridge proxy)

pi speaks standard OpenAI, so it needs the local bridge proxy running.

```bash
# 1) Start the bridge (it holds the token and refreshes it when it expires)
zed2cli proxy
#    (or:  ZED_TOKEN=eyJ… zed2cli proxy)

# 2) Install the extension (adds a `zed-ai` provider)
zed2cli install-pi

# 3) Verify and use
pi --list-models | grep zed-ai
pi --provider zed-ai --model zed-ai/claude-sonnet-4-6 "explain this repo"
# set as your default in `pi config`
```

The extension is self-contained by design (pi loads extensions from a virtual
URL, so relative imports don't work) — its model list mirrors `src/models.mjs`.

## 5. Auto-refresh (skip the hourly pasting)

Zed JWTs last ~1 hour. One daemon keeps `~/.zed_jwt_token` fresh and everyone
reads it automatically:

```bash
zed2cli daemon start     # background loop (every ~50 min)
zed2cli daemon install   # or: systemd user service, auto-start at login
zed2cli daemon status    # PID + current expiry
```

- **Where Zed is logged in** (keyring present): the daemon mints fresh JWTs
  from the keyring — zero setup.
- **Server / any machine without Zed**: paste the access token once
  (from §2D): `zed2cli token --save-access-token -`, then start/install the
  daemon. It exchanges it for fresh JWTs forever.
- Consumers pick the file up on their own: opencode plugin falls back to
  `~/.zed_jwt_token`; the proxy re-reads `--token-file` on expiry (or use
  `--token-script "zed2cli token --raw"`, which resolves from any source in
  order: env → keyring → access-token file → JWT file).

> A pasted **JWT** expires in ~1 h and cannot self-refresh; the daemon needs
> either the keyring or a saved access token to keep auto-renewing.

## 6. Hermes or any OpenAI-compatible CLI

Just point them at the bridge proxy:

```bash
zed2cli proxy
curl -s http://127.0.0.1:8787/v1/models | jq '.data[].id'
```

- **Hermes**: merge `config/hermes/zed-ai.yaml` into `~/.hermes/config.yaml`
  (provider `zed-ai` → `base_url: http://127.0.0.1:8787/v1`), then
  `hermes config set active_provider zed-ai` and `hermes doctor`.
- **Anything else**: base URL `http://127.0.0.1:8787/v1`, any API key (the
  proxy ignores it and authenticates to Zed itself).

Proxy options: `--port`, `--host`, `--token-file`, `--token-script`,
`--endpoint`, `--verbose` — see `zed2cli proxy --help`.

## 7. Troubleshooting

| Symptom | Cause / fix |
|---------|-------------|
| `401 Unauthorized` | JWT expired (~1 h) or wrong. Re-run `zed2cli token` (the proxy/daemon re-fetches automatically). |
| `451 … not available from this data center` | Zed geo-blocks some regions (e.g. HKG datacenters). Run `zed2cli geo-check` and move egress (VPN / another machine / Tailscale exit node). |
| Models missing / not on your plan | Your Zed plan differs from the Student plan used to build the catalog. Refresh from `GET https://cloud.zed.dev/models` and update `src/models.mjs` + `src/pi/zed-ai.mjs`. |
| `HTTP 500` with OpenAI models | The provider name must be `open_ai` and IDs use dots (`gpt-5.5`, not `gpt-5-5`) — already fixed. |
| `pi install` fails | Install pi first: `curl -fsSL https://pi.dev/install | bash` (or `bun install -g @earendil-works/pi-coding-agent`). |
| No models in `pi --list-models` | The extension didn't register — check `pi list` shows the package, and that you started the proxy. |

## 8. Notes

- **Unofficial**: this is an independent bridge, not affiliated with Zed,
  Anthropic, OpenAI, Google, xAI, or OpenCode. Zed can change model IDs, plan
  access, request shape, or geo policy at any time.
- **Token security**: the bridge holds your token in memory only (or re-fetches
  it from your keyring); it binds to `127.0.0.1` by default. Don't expose the
  proxy port on a network.
- **Verified on 2026-08-12** against `cloud.zed.dev` with a Student-plan token
  (auth, envelope, catalog, and the streaming translation via a recorded-trace
  replay). A live completion should be confirmed on your own machine.
