# zed2cli

Use Zed hosted AI models from your terminal coding agents. It works with
OpenCode, pi, Hermes, and any other tool that speaks the OpenAI API, all
through your existing Zed subscription and without running the Zed editor.

This is an unofficial bridge. It is not affiliated with Zed, Anthropic,
OpenAI, Google, xAI, or OpenCode.

## For users

### What this does for you

Zed keeps a set of AI models behind your Zed account. Normally you can only
reach them from inside the Zed editor. zed2cli lets your usual command line
agents use those same models through your Zed plan.

There are two ways to connect:

1. A plugin for OpenCode. It works with OpenCode 1 and OpenCode 2, and the
   installer picks the right build for the version you have. It runs inside
   OpenCode, so no extra process is needed. This is the recommended path.
2. A local bridge proxy. It exposes a normal OpenAI style API on your own
   machine. Point pi, Hermes, or any other OpenAI compatible client at it.

### Install

Install it globally with npm or bun:

```bash
npm install -g zed2cli
bun add -g zed2cli
```

Or run it on the fly without installing anything:

```bash
npx zed2cli geo-check
bunx zed2cli doctor
```

If this is your first time, follow [`INSTALL.md`](INSTALL.md). It is the step
by step runbook for OpenCode, pi, Hermes, and any OpenAI compatible CLI.

### Commands

```bash
zed2cli install-opencode        # install the OpenCode plugin, picks the build for your version
zed2cli install-pi              # register the zed-ai provider with pi
zed2cli proxy                   # start the OpenAI compatible bridge proxy
zed2cli token --raw             # print a fresh JWT
zed2cli daemon install          # refresh the JWT every 50 minutes with systemd
zed2cli geo-check               # diagnose geo blocking
zed2cli doctor                  # check your environment, tokens, and integrations
zed2cli help                    # show full usage
```

### Check your setup

`zed2cli doctor` inspects the whole chain and tells you what is wrong. It lists
every token source with its expiry, whether the OpenCode plugin matches your
OpenCode version, and whether the bridge proxy is running.

```bash
zed2cli doctor
```

The output names a stale token plainly instead of failing later in silence:

```text
Token sources:
  ZED_TOKEN env     : not set
  keyring/resolver  : valid for 60 min  (user 6yte96)
                      from: keyring (auto-refresh OK)
  .zed_jwt_token    : EXPIRED 49 day(s) ago  (user 6yte96)
  opencode zed-ai   : EXPIRED 63 day(s) ago  (user 6yte96)

Integration:
  opencode plugin   : v2
  bridge proxy 8787 : not running (start: zed2cli proxy)
```

If a line says `EXPIRED`, sign in to Zed again and run `zed2cli token`, or
start the refresh daemon so the file stays current.

### Sign in and get a token

A Zed JWT is short lived. It lasts about one hour. You can get one in three
ways.

1. From the keyring, which is best. This works when you are already signed in
   to Zed on this machine.

   ```bash
   zed2cli token            # show the token and its details
   zed2cli token --raw      # print only the raw JWT, for scripting
   zed2cli token --save     # save it to ~/.zed_jwt_token
   ```

   The keyring path needs `libsecret-tools`, `jq`, and `curl`. On Debian or
   Ubuntu you can install them with `sudo apt install libsecret-tools jq curl`.

2. Paste a token you captured from Zed. Open Zed, make any AI request, then
   copy the `Bearer eyJ...` value from a request to `cloud.zed.dev`.

3. Use an environment variable. Set `ZED_TOKEN` to your JWT.

Keep tokens private. Never commit them.

### Keep the token fresh automatically

Zed JWTs last about one hour. Run the refresh daemon once and it keeps a fresh
token in `~/.zed_jwt_token` in the background. The OpenCode plugin, the proxy,
and every command read that file automatically.

```bash
zed2cli daemon start     # background loop, refreshes every 50 minutes
zed2cli daemon install   # or an auto starting systemd user service
zed2cli daemon status    # show the process and the current expiry
```

On a machine where Zed is not signed in, set it up once like this. The long
lived access token keeps refreshing itself forever.

```bash
# on the machine where Zed is signed in:
zed2cli token --export-access-token     # prints something like: 571580 {"version":2,...}

# on the other machine, paste that printed line:
zed2cli token --save-access-token -
zed2cli daemon install
```

A pasted JWT still expires in about one hour and cannot refresh itself. Only
the keyring or a saved access token can mint fresh ones. That is what the
daemon uses, so typing a JWT by hand is only a fallback.

### Quick start for OpenCode

OpenCode uses the plugin, so no proxy is needed. The installer detects your
OpenCode version and installs the matching build.

```bash
zed2cli install-opencode
opencode models | grep zed-ai
opencode run -m zed-ai/claude-sonnet-4-6 "hello"
```

On OpenCode 2, no login step is needed. As long as `zed2cli token` can resolve
a JWT from your keyring, or `ZED_TOKEN` is set, the plugin works. On OpenCode 1,
run `opencode providers login --provider zed-ai` once and paste your `eyJ...`
JWT when it asks for an API key.

If the model shows as unavailable, run `zed2cli doctor` and confirm the plugin
line shows the version that matches your OpenCode.

### Quick start for pi

pi speaks standard OpenAI, so it needs the local bridge proxy running.

```bash
zed2cli proxy              # starts the bridge on http://127.0.0.1:8787/v1
zed2cli install-pi         # registers the zed-ai provider
pi --list-models | grep zed-ai
pi --provider zed-ai --model zed-ai/claude-sonnet-4-6 "hello"
```

### Quick start for Hermes or any OpenAI compatible tool

Start the proxy and point the tool at it:

```bash
zed2cli proxy
curl -s http://127.0.0.1:8787/v1/models | jq '.data[].id'
```

For Hermes, merge `config/hermes/zed-ai.yaml` into your `~/.hermes/config.yaml`.
For any other tool, set the base URL to `http://127.0.0.1:8787/v1` and use any
API key. The proxy ignores the key and authenticates to Zed itself.

### Models

This catalog was verified against `GET https://cloud.zed.dev/models` using a
Zed Student plan token. Other plans may expose a different list.

Anthropic: `claude-sonnet-5`, `claude-sonnet-4-6`, `claude-sonnet-4-5`,
`claude-haiku-4-5`

OpenAI: `gpt-5.6-sol`, `gpt-5.6-terra`, `gpt-5.6-luna`, `gpt-5.5`, `gpt-5.4`,
`gpt-5.3-codex`, `gpt-5.2`, `gpt-5-mini`, `gpt-5-nano`

Google: `gemini-3.1-pro-preview`, `gemini-3.5-flash`, `gemini-3-flash`

If your plan differs, refresh the catalog from the live endpoint:

```bash
curl -s https://cloud.zed.dev/models -H "authorization: Bearer $ZED_TOKEN" | jq '.models[].id'
```

### Troubleshooting

**401 Unauthorized, or "Zed token expired or you are signed out".** Your JWT
expired or is wrong. JWTs last about one hour. Run `zed2cli token` again, or
let the daemon or proxy refresh it for you. The proxy and the plugin now say
this plainly instead of failing silently.

**A stale token was in use with no warning.** `zed2cli doctor` now flags
expired sources. The resolver and the plugin also ignore an already expired
`ZED_TOKEN`, so a dead environment variable cannot win over a live keyring
token. If `~/.zed_jwt_token` is old, `zed2cli token --save` rewrites it.

**Model unavailable: zed-ai/...** On OpenCode 2 this means the plugin did not
load. Run `zed2cli install-opencode` to install the correct build for your
version, then confirm with `zed2cli doctor` that the plugin line matches.

**451 Access not available from this data center.** Your network egress is geo
blocked. This affects all providers, Anthropic, OpenAI, and Google alike. The
block is keyed on the Cloudflare edge your request lands on, so no header or
code change helps. The egress itself has to move. Run from a machine in an
allowed region, or use a VPN that exits in the US, EU, Singapore, Japan, or
Australia, or route through a Tailscale exit node on an allowed region machine.
Diagnose it with `zed2cli geo-check`.

**HTTP 500 with the openai provider.** The provider name must be `open_ai`, with
an underscore. This is already fixed in the repo.

**Model not found.** Model IDs can drift. Refresh them from the models endpoint
and update the catalog.

## For developers

### How the bridge works

Zed exposes a proprietary endpoint at `POST https://cloud.zed.dev/completions`.
It is authenticated with a short lived JWT from your Zed account. It speaks
neither OpenAI nor Anthropic natively. Requests are wrapped in a
`provider_request` envelope, and responses stream back as newline delimited
JSON events. zed2cli translates both directions.

Shared catalog: `src/models.mjs`. It is the single source of truth for the 16
models, each with its provider key, context size, output size, and capability
flags. It is imported by the OpenCode plugin and the proxy. The pi extension
carries its own inline copy because pi loads extensions from a virtual URL
where relative imports do not resolve.

### Entry points

`cli.mjs` is the `zed2cli` binary. It dispatches each subcommand to the bash
scripts in `scripts/`.

`src/index.mjs` is the OpenCode plugin for OpenCode 2. It registers a `zed-ai`
provider with `ctx.provider.transform`, then uses the `http.request` session
hook to rewrite the OpenAI request into the Zed envelope and point it at
`cloud.zed.dev/completions`, and the `http.response` hook to translate the Zed
event stream back into OpenAI server sent events. Everything happens in
process, so no proxy is required.

`src/index.v1.mjs` is the older OpenCode 1 plugin, kept for older installs. It
registers the provider through the V1 `config` hook and overrides
`options.fetch`. The installer copies whichever file matches the OpenCode
version it detects.

`src/proxy.mjs` is the OpenAI compatible bridge. It serves `GET /v1/models` and
`POST /v1/chat/completions` and forwards translated requests to Zed. It is what
pi, Hermes, and any other OpenAI client use.

`src/pi/zed-ai.mjs` is the pi extension. It registers a `zed-ai` provider that
points at the local proxy through `ZED_PROXY_URL`.

### Request translation

OpenAI chat messages are mapped to Anthropic style content blocks. A string
becomes a single text block. An `image_url` block with a base64 data URI
becomes an image block. Assistant `tool_calls` become `tool_use` blocks, and
`tool` role messages become `tool_result` blocks. The system prompt is sent
both inside `provider_request` and at the top level. Tool definitions are
mapped from `parameters` to `input_schema`.

### Response translation

Zed streams events of type `message_start`, `content_block_start`,
`content_block_delta`, `content_block_stop`, `message_delta`, and
`message_stop`, followed by a final line with `status: stream_ended`. Prose
deltas become OpenAI content chunks. Tool use blocks are coalesced and emitted
when the block stops. The stream ends with `data: [DONE]`.

### Token resolution

`scripts/zed-token.sh --raw` resolves a raw JWT from the best source available,
in this order: the `ZED_TOKEN` environment variable (skipped when it is already
expired), the system keyring, the `~/.zed_access_token` file, and finally the
`~/.zed_jwt_token` file. Only the keyring and the access token file can mint
fresh JWTs. The proxy re-runs its token script when it sees a 401. The resolver
decodes the JWT and prints an `EXPIRED` warning when the token it returns is
already dead.

The OpenCode plugin resolves a token the same way, with two differences. It
skips an already expired `ZED_TOKEN`, and it clears that variable when it
shells out to the resolver, so a stale exported token cannot win. It prefers a
`zed-token.sh` bundled beside it, then `zed2cli token --raw`, then
`~/.zed_jwt_token`.

### Adding or updating models

Fetch the current catalog, then update `src/models.mjs`. If you change any
model, update the inline list in `src/pi/zed-ai.mjs` to match. The two lists
must stay identical, and `npm run check-models` fails the build when they drift.

```bash
curl -s https://cloud.zed.dev/models -H "authorization: Bearer $ZED_TOKEN" | jq '.models'
```

### Packaging and publishing

The package ships `cli.mjs`, the files under `src` (including both
`index.mjs` and `index.v1.mjs`), the scripts, and the config samples. It has no
runtime dependencies and requires Node 18 or newer. The `prepublishOnly` script
runs `node --check` over every source file, runs `npm run check-models` to
confirm the pi catalog matches `src/models.mjs`, and runs `bash -n
scripts/*.sh`. `npm publish` calls it again, so none of these can be skipped.

To ship a release, bump the version and push to main:

1. Bump the version in `package.json`: `npm version patch` (or `minor`, or
   `major`).
2. Push it: `git push origin main`.

That is the whole flow. The Publish workflow runs on every push to main,
verifies, then publishes that version with `--provenance` if it is not already
on npm, and creates the `vX.Y.Z` git tag and a GitHub release with generated
notes. Push without changing the version and it runs the checks, sees that the
version is already published, and skips. There are no approvals and no manual
trigger.

The one time setup, which is bringing an npm token and storing it as the
repository secret `NPM_TOKEN`, is written out step by step in
[`RELEASING.md`](RELEASING.md). That page also covers the versioning rules,
where the version lives, and how to retry a failed release. Changes are
recorded in [`CHANGELOG.md`](CHANGELOG.md).

The companion workflow `.github/workflows/ci.yml` runs the same gates on pull
requests, across Node 18, 20, and 22, so problems are caught before they reach
main.

### Known limitations

`tool_choice` is not forwarded, so tools are always offered. Reasoning and
thinking deltas from models such as Claude Sonnet 5 are not surfaced as
separate reasoning blocks. Remote image URLs are skipped, so images must be
sent as base64 data URIs. The tooling shells out to bash, so on Windows you
need WSL or Git Bash. The OpenCode 2 plugin needs OpenCode 2.0 or newer; the
installer detects the major version and installs the OpenCode 1 plugin
otherwise.

### Security notes

The bridge holds your token in memory only, or re-fetches it from your keyring,
and it binds to `127.0.0.1` by default. The local proxy does not authenticate
its callers, so any process on the machine can use it. Do not expose the proxy
port on a network.

### Verified against the live endpoint

As of 2026, the following were confirmed against `cloud.zed.dev` with a Student
plan token. `GET /models` returns the full catalog of 16 models. A minimal
`/completions` request with the correct envelope is accepted and routed. The
proxy translation was verified end to end, including streaming. The OpenCode 2
plugin was verified end to end on OpenCode 2.0.29: the provider registers all
16 models, a streaming reply comes back, and a tool call round trip returns the
tool output to the model. Zed returns HTTP 451 for every provider from a geo
blocked region such as a Hong Kong datacenter, even though the token itself is
valid, because `/models` still returns 200.

### File map

```text
cli.mjs                        CLI dispatcher, the zed2cli binary
CHANGELOG.md                   notable changes per release
RELEASING.md                   npm token setup and the release flow
src/models.mjs                 verified model catalog and helpers, shared
src/index.mjs                  OpenCode 2 plugin for the zed-ai provider
src/index.v1.mjs               OpenCode 1 plugin, kept for older installs
src/proxy.mjs                  OpenAI compatible bridge proxy
src/pi/zed-ai.mjs              pi extension for the zed-ai provider
config/opencode.json.example   OpenCode config sample
config/hermes/zed-ai.yaml      Hermes config sample
scripts/zed-token.sh           unified JWT resolver, export, and save
scripts/zed-refresh-daemon.sh  JWT refresher, nohup or systemd user service
scripts/zed-proxy.sh           bridge launcher with token auto refresh
scripts/geo-check.sh           geo blocking diagnosis
scripts/install-opencode.sh    one command OpenCode plugin installer
scripts/install-pi.sh          one command pi extension installer
scripts/check-models.mjs       fail the build when the pi catalog drifts
.github/workflows/ci.yml       run the checks on pull requests
.github/workflows/publish.yml  publish to npm on every push to main
```

## License

MIT. See [`LICENSE`](LICENSE).
