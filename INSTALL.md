# Installing zed2cli

This guide is for anyone using Zed hosted models from their own machine through
the `zed2cli` npm package. It covers OpenCode, pi, Hermes, and any OpenAI
compatible CLI. The README describes the project in depth; this page is the
install runbook.

## 0. What you need

**Zed account** on a plan that includes AI models. This was verified against the
Zed Student plan, and other plans may expose a different model list.

**Node.js 18 or newer** and **bash**. On Windows use WSL or Git Bash.

**At least one CLI agent**, either OpenCode, pi, or anything that speaks the
OpenAI API.

**Optional, libsecret-tools** so zed2cli can pull fresh Zed tokens from your
system keyring automatically.

```bash
sudo apt install libsecret-tools jq curl   # Debian/Ubuntu
sudo dnf install libsecret jq curl         # Fedora
```

## 1. Install the package

```bash
npm install -g zed2cli          # or:  bun add -g zed2cli
zed2cli --version               # sanity check
```

Run a one off command without installing anything (each one downloads on
demand):

```bash
npx zed2cli geo-check
bunx zed2cli doctor
```

Cloning the repo instead works the same way. Clone it, enter the directory, and
`node cli.mjs` behaves exactly like `zed2cli`.

## 2. Get a Zed token

Zed JWTs are short lived, about one hour. Choose one of these.

**A. From your keyring.** Use this when you are signed in to Zed on this
machine.

```bash
zed2cli token            # shows the token and its details
zed2cli token --raw      # raw JWT only, for scripting
```

The keyring helper uses `secret-tool` (libsecret) and is Linux only. On macOS or
Windows, use option B.

**B. Capture it from Zed itself.** Open Zed, make any AI request, and copy the
`Authorization: Bearer eyJ...` header from a request to `cloud.zed.dev`. Paste
the `eyJ...` part. Only the `eyJ...` token is a JWT; the keyring also stores an
access token, which option D covers.

**C. Env var.** Set `export ZED_TOKEN=eyJ...`.

**D. Access token for another machine.** On the machine where Zed is logged in,
print the long lived access token once:

```bash
zed2cli token --export-access-token    # prints: 571580 {"version":2,...}
```

Then on the server, covered in section 5, paste that line with
`zed2cli token --save-access-token -`. The daemon uses it to keep minting fresh
JWTs forever, with no re-pasting needed.

Keep tokens private. They grant access to your Zed plan. Never commit them.

## 3. OpenCode (plugin, no proxy needed)

The plugin translates requests in-process, so OpenCode needs nothing else
running. There is one build for OpenCode 1 and one for OpenCode 2, and the
installer picks the right one for the version it detects.

```bash
zed2cli install-opencode
```

That copies the plugin into `~/.config/opencode/node_modules/opencode-zed-ai/`
and wires it into `~/.config/opencode/opencode.json`, backing the file up first.
It needs `jq`, and without `jq` it prints the one line to add by hand. On
OpenCode 2 it adds a directory entry under `plugins`. On OpenCode 1 it adds a
file entry under `plugin`.

Then verify:

```bash
zed2cli doctor                                   # token expiry + plugin version
opencode models | grep zed-ai                    # expect 16 zed-ai models
opencode run -m zed-ai/claude-sonnet-4-6 "hello"
```

On OpenCode 2 there is no login step. The plugin reads your token from the
keyring, from `ZED_TOKEN`, or from `~/.zed_jwt_token`. On OpenCode 1, run
`opencode providers login --provider zed-ai` once and paste your `eyJ...` JWT
where it asks for the API key.

## 4. pi (extension + bridge proxy)

pi speaks standard OpenAI, so it needs the local bridge proxy running.

```bash
# 1) Start the bridge, which holds the token and refreshes it when it expires
zed2cli proxy
#    (or:  ZED_TOKEN=eyJ... zed2cli proxy)

# 2) Install the extension, which adds a zed-ai provider
zed2cli install-pi

# 3) Verify and use
pi --list-models | grep zed-ai
pi --provider zed-ai --model zed-ai/claude-sonnet-4-6 "explain this repo"
# set it as your default in `pi config`
```

The extension is self contained by design, because pi loads extensions from a
virtual URL where relative imports do not work, so its model list mirrors
`src/models.mjs`.

## 5. Auto refresh (skip the hourly pasting)

Zed JWTs last about one hour. One daemon keeps `~/.zed_jwt_token` fresh and
everyone reads it automatically.

```bash
zed2cli daemon start     # background loop, every 50 minutes
zed2cli daemon install   # or: systemd user service, auto-start at login
zed2cli daemon status    # PID and current expiry
```

**Where Zed is logged in** and the keyring is present: the daemon mints fresh
JWTs from the keyring with zero setup.

**On a server or any machine without Zed**: paste the access token once, from
section 2D, with `zed2cli token --save-access-token -`, then start or install
the daemon. It exchanges that token for fresh JWTs forever.

**Consumers pick the file up on their own.** The OpenCode plugin falls back to
`~/.zed_jwt_token`. The proxy re-reads `--token-file` on expiry, or you can use
`--token-script "zed2cli token --raw"`, which resolves from any source in this
order: env, then keyring, then access token file, then JWT file.

A pasted JWT expires in about one hour and cannot refresh itself. The daemon
needs either the keyring or a saved access token to keep auto renewing.

## 6. Hermes or any OpenAI compatible CLI

Point them at the bridge proxy.

```bash
zed2cli proxy
curl -s http://127.0.0.1:8787/v1/models | jq '.data[].id'
```

**Hermes**: merge `config/hermes/zed-ai.yaml` into `~/.hermes/config.yaml`,
where the provider `zed-ai` uses `base_url: http://127.0.0.1:8787/v1`, then run
`hermes config set active_provider zed-ai` and `hermes doctor`.

**Anything else**: base URL `http://127.0.0.1:8787/v1` and any API key. The
proxy ignores the key and authenticates to Zed itself.

Proxy options are `--port`, `--host`, `--token-file`, `--token-script`,
`--endpoint`, and `--verbose`. Run `zed2cli proxy --help`.

## 7. Troubleshooting

**`401 Unauthorized`, or "Zed token expired or you are signed out".** The JWT
expired, about one hour, or it is wrong. Re-run `zed2cli token`. The proxy, the
daemon, and the plugin refresh automatically. `zed2cli doctor` lists each token
source with its expiry.

**`Model unavailable: zed-ai/...`.** On OpenCode 2 the plugin did not load.
Re-run `zed2cli install-opencode` and check that `zed2cli doctor` shows the
matching plugin version.

**`451`, not available from this data center.** Zed geo blocks some regions,
for example HKG datacenters. Run `zed2cli geo-check` and move the egress, with a
VPN, another machine, or a Tailscale exit node.

**Models missing, or not on your plan.** Your Zed plan differs from the Student
plan used to build the catalog. Refresh from `GET https://cloud.zed.dev/models`
and update `src/models.mjs` and `src/pi/zed-ai.mjs`.

**`HTTP 500` with OpenAI models.** The provider name must be `open_ai`, with an
underscore, and IDs use dots such as `gpt-5.5`, not `gpt-5-5`. This is already
fixed in the repo.

**`pi install` fails.** Install pi first, with
`curl -fsSL https://pi.dev/install | bash`, or
`bun install -g @earendil-works/pi-coding-agent`.

**No models in `pi --list-models`.** The extension did not register. Check that
`pi list` shows the package, and that you started the proxy.

## 8. Notes

**Unofficial.** This is an independent bridge, not affiliated with Zed,
Anthropic, OpenAI, Google, xAI, or OpenCode. Zed can change model IDs, plan
access, request shape, or geo policy at any time.

**Token security.** The bridge holds your token in memory only, or re-fetches
it from your keyring, and it binds to `127.0.0.1` by default. Do not expose the
proxy port on a network.

**Verified on 2026-08-12** against `cloud.zed.dev` with a Student plan token,
covering auth, the envelope, the catalog, and the streaming translation. The
OpenCode 2 plugin was later verified end to end on OpenCode 2.0.29, including a
streaming reply and a tool call round trip. Confirm a live completion on your
own machine.
