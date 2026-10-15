/**
 * @type {import('@opencode-ai/plugin').Plugin}
 *
 * zed-open — OpenCode provider plugin for Zed-hosted AI models.
 *
 * Registers a `zed-ai` provider with OpenCode 1.18+. The provider is wired
 * as an `@ai-sdk/openai-compatible` provider whose `options.fetch` is
 * overridden: instead of hitting the OpenAI-shaped URL, the override
 * translates the OpenAI request into Zed's proprietary envelope and POSTs
 * it to `cloud.zed.dev/completions`, then adapts Zed's NDJSON event stream
 * back into OpenAI SSE so OpenCode's chat + tool-call flow keeps working.
 *
 * Environment overrides (all optional):
 *   ZED_TOKEN      - fallback bearer token if not stored via `opencode providers login`
 *   ZED_TOKEN_FILE - file containing a fresh JWT (default: ~/.zed_jwt_token, kept
 *                    fresh by scripts/zed-refresh-daemon.sh)
 *   ZED_ENDPOINT   - completions endpoint (default: https://cloud.zed.dev/completions)
 *   ZED_VERSION    - Zed version header (default: pinned stable build)
 */
import crypto from "node:crypto";
import os from "node:os";
import path from "node:path";
import { readFile } from "node:fs/promises";
import {
    ZED_MODELS,
    ZED_ENDPOINT,
    ZED_VERSION,
    DEFAULT_MODEL,
    resolveModel,
} from "./models.mjs";

export async function ZedAiPlugin({ client }) {
    const zedEndpoint = process.env.ZED_ENDPOINT || ZED_ENDPOINT;
    const zedVersion = process.env.ZED_VERSION || ZED_VERSION;
    const userAgent = process.env.ZED_USER_AGENT ||
        `Zed/${zedVersion} (${process.platform}; ${process.arch === "x64" ? "x86_64" : process.arch})`;

    // Resolved lazily so a token pasted after plugin load still works.
    let zedToken = process.env.ZED_TOKEN?.trim() || "";
    let warnedNoToken = false;

    function safeJsonParse(str) {
        if (!str) return null;
        try { return JSON.parse(str); } catch { return null; }
    }

    // Shared normalization so the loader and the request path can't drift.
    function normalizeToken(value) {
        return (value || "").trim().replace(/^Bearer\s+/i, "").replace(/\s+/g, "");
    }

    function contentToBlocks(content) {
        if (typeof content === "string") {
            return content ? [{ type: "text", text: content }] : [];
        }
        if (!Array.isArray(content)) return [];
        return content.map(block => {
            if (!block) return null;
            if (block.type === "text") return { type: "text", text: block.text || "" };
            if (block.type === "image_url") {
                const url = block.image_url?.url || "";
                const m = url.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/s);
                if (m) {
                    return {
                        type: "image",
                        source: { type: "base64", media_type: m[1], data: m[2] },
                    };
                }
                return null;
            }
            // Anthropic-style blocks pass through (tool_use / tool_result / image)
            return block;
        }).filter(Boolean);
    }

    // Normalize OpenAI chat.completions (and tolerant of Anthropic blocks) -> Zed messages
    function normalizeMessages(messages) {
        const clean = [];
        for (const m of messages || []) {
            if (!m) continue;
            if (m.role === "system") continue; // carried separately
            if (m.role === "user") {
                clean.push({ role: "user", content: contentToBlocks(m.content) });
            } else if (m.role === "assistant") {
                const blocks = contentToBlocks(m.content);
                for (const tc of m.tool_calls || []) {
                    blocks.push({
                        type: "tool_use",
                        id: tc.id || crypto.randomUUID(),
                        name: tc.function?.name,
                        input: safeJsonParse(tc.function?.arguments) || {},
                    });
                }
                if (blocks.length) clean.push({ role: "assistant", content: blocks });
            } else if (m.role === "tool") {
                let text = "";
                if (typeof m.content === "string") text = m.content;
                else if (Array.isArray(m.content)) text = m.content.map(b => b.text ?? "").join("");
                else if (m.content) text = JSON.stringify(m.content);
                clean.push({
                    role: "user",
                    content: [{
                        type: "tool_result",
                        tool_use_id: m.tool_call_id,
                        content: [{ type: "text", text: text || "" }],
                        is_error: false,
                    }],
                });
            }
        }
        return clean;
    }

    function buildZedPayload(originalBody) {
        const { messages = [], system, tools, max_tokens, temperature } = originalBody;
        const model = resolveModel(originalBody.model) ? originalBody.model : DEFAULT_MODEL;
        const modelInfo = ZED_MODELS[model];

        let cleanTools;
        if (Array.isArray(tools)) {
            cleanTools = tools.map(t => {
                const fn = t.function || t;
                return {
                    name: fn.name,
                    description: fn.description,
                    input_schema: fn.parameters || fn.input_schema || { type: "object", properties: {} }
                };
            }).filter(t => t.name);
        }

        const systemPrompt = (system || "") +
            `\n\n## Tool Protocol\n- You have access to: terminal, read_file, edit_file, grep, list_directory, find_path, create_directory, delete_path, move_path, copy_path, now, open, fetch, web_search.\n- Use native tool_use API only.\n- NEVER output XML tags like <tool_use>.\n- The user already sees tool output. Do not repeat it.\n- End every response with an 'Automatic Checklist' (- [ ]).`;

        return {
            thread_id: crypto.randomUUID(),
            prompt_id: crypto.randomUUID(),
            intent: "user_prompt",
            provider: modelInfo.provider,
            model,
            provider_request: {
                model,
                max_tokens: max_tokens || modelInfo.output || 64000,
                messages: normalizeMessages(messages),
                ...(cleanTools && cleanTools.length > 0 && { tools: cleanTools }),
                system: systemPrompt
            },
            system: systemPrompt,
            temperature: temperature || 1.0
        };
    }

    async function zedFetch(input, init) {
        const token = normalizeToken(zedToken);
        let originalBody = typeof init.body === "string" ? JSON.parse(init.body) : init.body;
        originalBody = originalBody || {};
        const zedPayload = buildZedPayload(originalBody);

        const headers = new Headers();
        headers.set("accept", "*/*");
        headers.set("authorization", `Bearer ${token}`);
        headers.set("content-type", "application/json");
        headers.set("user-agent", userAgent);
        headers.set("x-zed-client-supports-status-messages", "true");
        headers.set("x-zed-client-supports-stream-ended-request-completion-status", "true");
        headers.set("x-zed-version", zedVersion);

        const response = await fetch(zedEndpoint, {
            method: "POST",
            headers,
            body: JSON.stringify(zedPayload)
        });

        // Pass through non-OK responses (401, 451 geo-block, rate limits, ...)
        // so the real message from Zed shows up in OpenCode.
        if (!response.ok) {
            const text = await response.text();
            return new Response(text || response.statusText, {
                status: response.status,
                statusText: response.statusText,
                headers: { "content-type": "text/plain; charset=utf-8" }
            });
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        const encoder = new TextEncoder();

        const stream = new ReadableStream({
            async start(controller) {
                let buffer = "";
                let currentToolCall = null;
                try {
                    while (true) {
                        const { done, value } = await reader.read();
                        if (done) break;

                        buffer += decoder.decode(value, { stream: true });
                        const lines = buffer.split("\n");
                        buffer = lines.pop() || "";

                        for (const line of lines) {
                            const trimmed = line.trim();
                            if (!trimmed) continue;
                            try {
                                const json = JSON.parse(trimmed);
                                const event = json.event;
                                if (!event) continue;

                                let chunk;
                                if (event.type === "content_block_start" && event.content_block?.type === "tool_use") {
                                    currentToolCall = {
                                        index: event.index,
                                        id: event.content_block.id,
                                        type: "function",
                                        function: { name: event.content_block.name, arguments: "" }
                                    };
                                } else if (event.type === "content_block_delta" && event.delta?.partial_json) {
                                    if (currentToolCall) currentToolCall.function.arguments += event.delta.partial_json;
                                } else if (event.type === "content_block_stop") {
                                    if (currentToolCall) {
                                        chunk = { choices: [{ delta: { tool_calls: [currentToolCall] } }] };
                                        currentToolCall = null;
                                    }
                                } else if (event.type === "content_block_delta" && event.delta?.text) {
                                    chunk = { choices: [{ delta: { content: event.delta.text } }] };
                                } else if (event.type === "message_start") {
                                    chunk = { choices: [{ delta: { role: "assistant" } }] };
                                } else if (event.type === "message_delta" && event.delta?.stop_reason) {
                                    chunk = { choices: [{ finish_reason: event.delta.stop_reason === "tool_use" ? "tool_calls" : "stop", delta: {} }] };
                                }

                                if (chunk) {
                                    controller.enqueue(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`));
                                }
                            } catch (e) { /* skip non-JSON keepalives */ }
                        }
                    }
                } catch (error) {
                    controller.error(error);
                } finally {
                    controller.enqueue(encoder.encode("data: [DONE]\n\n"));
                    controller.close();
                }
            }
        });

        return new Response(stream, {
            headers: { "content-type": "text/event-stream" }
        });
    }

    return {
        config: async (config) => {
            config.provider = config.provider || {};
            config.provider["zed-ai"] = {
                name: "Zed AI",
                // opencode 1.18 routes plugin providers through an AI SDK
                // adapter; openai-compatible + custom fetch is the supported
                // way to talk to a non-OpenAI endpoint from a plugin.
                npm: "@ai-sdk/openai-compatible",
                options: {
                    baseURL: "https://cloud.zed.dev",
                    apiKey: zedToken || "zed-ai",
                    fetch: zedFetch
                },
                models: Object.fromEntries(Object.entries(ZED_MODELS).map(([id, model]) => [
                    id,
                    {
                        name: model.name,
                        limit: { context: model.context, output: model.output },
                        capabilities: {
                            temperature: true,
                            reasoning: model.supportsReasoning,
                            attachment: model.supportsImages,
                            toolcall: model.supportsTools,
                            input: { text: true, image: model.supportsImages, pdf: false },
                            output: { text: true }
                        }
                    }
                ]))
            };
        },

        auth: {
            provider: "zed-ai",
            loader: async (getAuth) => {
                let info = await getAuth();
                if (info && info.type === "api") {
                    zedToken = normalizeToken(info.key);
                } else if (process.env.ZED_TOKEN?.trim()) {
                    zedToken = process.env.ZED_TOKEN.trim();
                } else {
                    // Fresh-token file maintained by scripts/zed-refresh-daemon.sh —
                    // lets the plugin ride automatic refreshes with zero manual
                    // logins (and works on servers that only have a saved access
                    // token). Missing file is fine; ZED_TOKEN or login can override.
                    const tokenFile = process.env.ZED_TOKEN_FILE
                        || path.join(os.homedir(), ".zed_jwt_token");
                    try {
                        zedToken = normalizeToken(await readFile(tokenFile, "utf8"));
                    } catch { /* no token file yet */ }
                }
                if (!zedToken) {
                    // Warn once (not per-request) to avoid spamming server logs.
                    if (!process.env.ZED_TOKEN?.trim() && !warnedNoToken) {
                        warnedNoToken = true;
                        console.error("[zed-ai] No token found. Run `opencode providers login --provider zed-ai` and paste your Zed JWT (eyJ...), or set ZED_TOKEN.");
                    }
                    return {};
                }
                if (!/^eyJ/i.test(zedToken)) {
                    console.error(`[zed-ai] WARNING: stored credential does not look like a Zed JWT (should start with "eyJ"). Got: ${zedToken.slice(0, 6)}...`);
                }
                return { apiKey: zedToken };
            },
            // Single prompt by design: OpenCode ALWAYS shows its built-in "API key"
            // input for `type: "api"` methods (see handlePluginAuth in opencode's
            // cli/cmd/providers.ts). A custom `prompts` entry would only ADD a
            // second prompt asking for the same token. So there are no custom
            // prompts and no authorize() — the token you paste into the single
            // API key prompt is stored as the credential directly.
            methods: [
                {
                    type: "api",
                    label: "Login with Zed Session Token",
                }
            ]
        }
    };
}

export const server = ZedAiPlugin;
export default ZedAiPlugin;
