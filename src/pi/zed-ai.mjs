/**
 * zed2cli pi extension
 * --------------------
 * Registers a `zed-ai` provider with the pi coding agent
 * (@earendil-works/pi-coding-agent, https://pi.dev).
 *
 * pi speaks standard OpenAI APIs, so it cannot talk to Zed's proprietary
 * `cloud.zed.dev/completions` endpoint directly. This extension points pi
 * at the local zed2cli bridge proxy (src/proxy.mjs), which translates
 * OpenAI chat completions to and from the Zed envelope.
 *
 * NOTE: this file is intentionally SELF-CONTAINED (no imports). pi loads
 * extension files from a virtual URL, so relative imports and
 * `import.meta.url`-based resolution do not work. The model catalog below
 * mirrors src/models.mjs, so keep them in sync when refreshing models.
 *
 * Requirements
 *   1. Start the bridge proxy (it holds your Zed token):
 *        ./scripts/zed-proxy.sh          # token from keyring/env
 *        # or:  ZED_TOKEN=eyJ... node src/proxy.mjs
 *   2. Install this extension:
 *        zed2cli install-pi
 *      (or load it ad-hoc with:  pi -e /path/to/zed2cli/src/pi/zed-ai.mjs)
 *   3. Use it:
 *        pi --provider zed-ai --model zed-ai/claude-sonnet-4-6 "hello"
 *        # or set it as default in `pi config` / settings.json
 *
 * Env vars:
 *   ZED_PROXY_URL  base URL of the bridge proxy (default http://127.0.0.1:8787/v1)
 */

// Mirrors src/models.mjs, verified against GET https://cloud.zed.dev/models
// (Zed Student plan, 2026-08-12). Provider keys: anthropic | open_ai | google.
const ZED_MODELS = [
    { id: "claude-sonnet-5", name: "Claude Sonnet 5", reasoning: true, images: true, context: 1000000, output: 128000 },
    { id: "claude-sonnet-4-6", name: "Claude Sonnet 4.6", reasoning: true, images: true, context: 1000000, output: 64000 },
    { id: "claude-sonnet-4-5", name: "Claude Sonnet 4.5", reasoning: true, images: true, context: 200000, output: 8192 },
    { id: "claude-haiku-4-5", name: "Claude Haiku 4.5", reasoning: true, images: true, context: 200000, output: 64000 },
    { id: "gpt-5.6-sol", name: "GPT-5.6 Sol", reasoning: true, images: true, context: 400000, output: 128000 },
    { id: "gpt-5.6-terra", name: "GPT-5.6 Terra", reasoning: true, images: true, context: 400000, output: 128000 },
    { id: "gpt-5.6-luna", name: "GPT-5.6 Luna", reasoning: true, images: true, context: 400000, output: 128000 },
    { id: "gpt-5.5", name: "GPT-5.5", reasoning: true, images: true, context: 400000, output: 128000 },
    { id: "gpt-5.4", name: "GPT-5.4", reasoning: true, images: true, context: 400000, output: 128000 },
    { id: "gpt-5.3-codex", name: "GPT-5.3-Codex", reasoning: true, images: true, context: 400000, output: 128000 },
    { id: "gpt-5.2", name: "GPT-5.2", reasoning: false, images: true, context: 400000, output: 128000 },
    { id: "gpt-5-mini", name: "GPT-5 mini", reasoning: false, images: true, context: 400000, output: 128000 },
    { id: "gpt-5-nano", name: "GPT-5 nano", reasoning: false, images: true, context: 400000, output: 128000 },
    { id: "gemini-3.1-pro-preview", name: "Gemini 3.1 Pro", reasoning: true, images: true, context: 200000, output: 65535 },
    { id: "gemini-3.5-flash", name: "Gemini 3.5 Flash", reasoning: true, images: true, context: 1048576, output: 65535 },
    { id: "gemini-3-flash", name: "Gemini 3 Flash", reasoning: true, images: true, context: 1048576, output: 65535 },
];

export default function (pi) {
    const baseUrl = process.env.ZED_PROXY_URL || "http://127.0.0.1:8787/v1";

    pi.registerProvider("zed-ai", {
        name: "Zed AI (via zed2cli bridge)",
        baseUrl,
        apiKey: "zed2cli", // cosmetic: the bridge authenticates to Zed itself
        api: "openai-completions",
        models: ZED_MODELS.map((m) => ({
            id: m.id,
            name: m.name,
            reasoning: m.reasoning,
            input: ["text", ...(m.images ? ["image"] : [])],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: m.context,
            maxTokens: m.output,
        })),
    });
}
