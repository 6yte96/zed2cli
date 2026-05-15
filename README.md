# zed-open

OpenCode plugin for using Zed-hosted AI models through Zed's `cloud.zed.dev/completions` endpoint.

This is an unofficial bridge. It is not affiliated with Zed, Anthropic, OpenAI, Google, xAI, or OpenCode.

## What Works

- Registers a `zed-ai` provider in OpenCode.
- Uses your Zed session token for authentication.
- Sends OpenCode chat/tool requests to Zed's hosted completions endpoint.
- Supports OpenCode tool calls through the streamed response adapter.
- Exposes Zed-hosted models that are available on the Zed Student plan.

## Student Plan Models

The Zed docs say Claude Opus models, GPT-5.5 pro, and GPT-5.4 pro are not available on the Student plan, so they are intentionally not registered here.

Configured model IDs:

```text
zed-ai/claude-sonnet-4-6
zed-ai/claude-sonnet-4-5
zed-ai/claude-haiku-4-5
zed-ai/gpt-5-5
zed-ai/gpt-5-4
zed-ai/gpt-5-3-codex
zed-ai/gpt-5-2
zed-ai/gpt-5-2-codex
zed-ai/gpt-5-mini
zed-ai/gpt-5-nano
zed-ai/gemini-3-1-pro
zed-ai/gemini-3-flash
zed-ai/grok-4
zed-ai/grok-4-fast
zed-ai/grok-4-fast-non-reasoning
zed-ai/grok-code-fast-1
```

Reference: https://zed.dev/docs/ai/models

## Install

Clone this repo and copy the plugin files into OpenCode's config plugin directory:

```bash
mkdir -p "$HOME/.config/opencode/node_modules/opencode-zed-ai"
cp src/index.mjs "$HOME/.config/opencode/node_modules/opencode-zed-ai/index.mjs"
cp src/package.json "$HOME/.config/opencode/node_modules/opencode-zed-ai/package.json"
```

OpenCode 1.14 may try to install bare plugin names from npm. Use an explicit local file path in `~/.config/opencode/config.json`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["/home/YOUR_USER/.config/opencode/node_modules/opencode-zed-ai/index.mjs"]
}
```

Replace `/home/YOUR_USER` with your real home directory.

## Authenticate

Capture a Zed session token from a Zed request to `cloud.zed.dev`. You can paste either the raw JWT or the full `Bearer eyJ...` value:

```bash
opencode providers login --provider zed-ai --method "Login with Zed Session Token"
```

The token is stored by OpenCode in its auth storage.

## Verify

List the registered models:

```bash
opencode models zed-ai
```

Run OpenCode with a Zed-hosted model:

```bash
opencode -m zed-ai/claude-sonnet-4-6
```

Or select one in the TUI with `/models`.

## Notes

- Zed can change hosted model IDs, plan access, request shape, or endpoint behavior at any time.
- A `401 Unauthorized` usually means the Zed session token expired or was pasted incorrectly.
- A model that appears in OpenCode can still fail if Zed does not permit it for your account or if the internal model ID changes.
