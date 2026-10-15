#!/usr/bin/env node
/**
 * zed-open bridge proxy
 * ---------------------
 * Exposes an OpenAI-compatible API (GET /v1/models, POST /v1/chat/completions)
 * in front of Zed's proprietary `cloud.zed.dev/completions` endpoint.
 *
 * This is what lets agents that only speak OpenAI (pi, hermes, and any other
 * CLI / SDK) use Zed-hosted models through your Zed subscription token.
 *
 * Usage:
 *   node src/proxy.mjs [--port 8787] [--host 127.0.0.1]
 *                      [--token-file /path/to/jwt] [--token-script "cmd ..."]
 *                      [--endpoint https://cloud.zed.dev/completions]
 *
 * Token sources, in priority order:
 *   1. ZED_TOKEN environment variable
 *   2. --token-file <path>           (file containing the raw JWT)
 *   3. --token-script "<command>"    (command that prints a raw JWT; re-run
 *                                     automatically when the token expires)
 *
 * The script never stores the token; it only forwards it to cloud.zed.dev.
 */

import http from "node:http";
import crypto from "node:crypto";
import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { promisify } from "node:util";

import {
    ZED_MODELS,
    ZED_ENDPOINT,
    ZED_VERSION,
    DEFAULT_MODEL,
    normalizeModelId,
    resolveModel,
    describeExpiry,
} from "./models.mjs";

const execFileAsync = promisify(execFile);
const uuid = () => crypto.randomUUID();
const normalizeToken = (raw) => (raw || "").trim().replace(/^Bearer\s+/i, "").replace(/\s+/g, "");

// ---------------------------------------------------------------------------
// CLI args
// ---------------------------------------------------------------------------

function parseArgs(argv) {
    const args = {
        port: Number(process.env.ZED_PROXY_PORT || 8787),
        host: process.env.ZED_PROXY_HOST || "127.0.0.1",
        endpoint: process.env.ZED_ENDPOINT || ZED_ENDPOINT,
        version: process.env.ZED_VERSION || ZED_VERSION,
        tokenFile: process.env.ZED_TOKEN_FILE || null,
        tokenScript: process.env.ZED_TOKEN_SCRIPT || null,
        verbose: false,
    };
    for (let i = 0; i < argv.length; i++) {
        const a = argv[i];
        switch (a) {
            case "--port": args.port = Number(argv[++i]); break;
            case "--host": args.host = argv[++i]; break;
            case "--endpoint": args.endpoint = argv[++i]; break;
            case "--version": args.version = argv[++i]; break;
            case "--token-file": args.tokenFile = argv[++i]; break;
            case "--token-script": args.tokenScript = argv[++i]; break;
            case "--verbose": args.verbose = true; break;
            case "--help":
            case "-h":
                console.log(`zed-open bridge proxy

Usage: node src/proxy.mjs [options]

Options:
  --port <n>           Listen port (default: 8787, env ZED_PROXY_PORT)
  --host <addr>        Listen host (default: 127.0.0.1, env ZED_PROXY_HOST)
  --endpoint <url>     Zed completions endpoint (default: cloud.zed.dev)
  --version <ver>      Zed version header sent to the endpoint
  --token-file <path>  File containing the raw JWT (also ZED_TOKEN_FILE)
  --token-script <cmd> Command that prints a raw JWT; re-run on expiry
                       (also ZED_TOKEN_SCRIPT). Example:
                       --token-script "bash scripts/zed-token.sh --raw"
  --verbose            Log requests to stderr
  -h, --help           Show this help

Token priority: ZED_TOKEN env > --token-file > --token-script`);
                process.exit(0);
            default:
                console.error(`Unknown option: ${a}`);
                process.exit(1);
        }
    }
    return args;
}

// ---------------------------------------------------------------------------
// Token handling
// ---------------------------------------------------------------------------

function splitCommand(cmd) {
    // Simple whitespace split that respects double quotes.
    const out = [];
    const re = /"([^"]*)"|'([^']*)'|(\S+)/g;
    let m;
    while ((m = re.exec(cmd))) out.push(m[1] ?? m[2] ?? m[3]);
    return out;
}

async function runTokenScript(script) {
    const [cmd, ...rest] = splitCommand(script);
    const { stdout } = await execFileAsync(cmd, rest, { timeout: 20000 });
    // Tokens never contain whitespace; take the last non-empty line in case
    // the command prints extra output (e.g. progress text).
    const lines = stdout.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    return normalizeToken(lines[lines.length - 1]);
}

function createTokenManager(args) {
    let token = process.env.ZED_TOKEN?.trim() || null;

    async function loadInitial() {
        if (!token && args.tokenFile) {
            try {
                token = normalizeToken(await readFile(args.tokenFile, "utf8"));
            } catch (err) {
                console.error(`[zed-proxy] WARN: cannot read token file ${args.tokenFile}: ${err.message}`);
            }
        }
        if (!token && args.tokenScript) {
            try {
                token = await runTokenScript(args.tokenScript);
            } catch (err) {
                console.error(`[zed-proxy] WARN: token script failed: ${err.message}`);
            }
        }
        if (!token) {
            console.error(
                "[zed-proxy] ERROR: no Zed token available. You are not signed in or no token source is set."
            );
            console.error(
                "[zed-proxy] Fix: sign in to Zed on this machine and run `zed2cli token`, or paste an access token with `zed2cli token --save-access-token -`, or set ZED_TOKEN."
            );
            process.exit(1);
        }
        console.error(`[zed-proxy] token loaded (${describeExpiry(token)})`);
    }

    async function refresh() {
        if (args.tokenScript) {
            try {
                token = await runTokenScript(args.tokenScript);
                console.error(`[zed-proxy] token refreshed (${describeExpiry(token)})`);
                return true;
            } catch (err) {
                console.error(`[zed-proxy] WARN: token refresh failed: ${err.message}`);
            }
        }
        if (args.tokenFile) {
            // An external refresher (e.g. scripts/zed-refresh-daemon.sh) may
            // have rewritten the file — re-read it on expiry.
            try {
                const fresh = normalizeToken(await readFile(args.tokenFile, "utf8"));
                if (fresh) {
                    token = fresh;
                    console.error(`[zed-proxy] token re-read from file (${describeExpiry(token)})`);
                    return true;
                }
            } catch (err) {
                console.error(`[zed-proxy] WARN: cannot re-read token file ${args.tokenFile}: ${err.message}`);
            }
        }
        return false;
    }

    return { get: () => token, refresh, loadInitial };
}

// ---------------------------------------------------------------------------
// OpenAI -> Zed request translation
// ---------------------------------------------------------------------------

function openAiContentToZedBlocks(content, verbose) {
    if (typeof content === "string") {
        return content ? [{ type: "text", text: content }] : [];
    }
    if (!Array.isArray(content)) return [];
    const blocks = [];
    for (const block of content) {
        if (!block) continue;
        if (block.type === "text" || (block.text !== undefined && block.type !== "image_url")) {
            if (block.text) blocks.push({ type: "text", text: block.text });
        } else if (block.type === "image_url") {
            const url = block.image_url?.url || "";
            const m = url.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/s);
            if (m) {
                blocks.push({
                    type: "image",
                    source: { type: "base64", media_type: m[1], data: m[2] },
                });
            } else if (verbose) {
                console.error(`[zed-proxy] WARN: skipping non-data-URI image: ${url.slice(0, 60)}`);
            }
        } else if (block.type === "input_text" || block.type === "input_image") {
            // OpenAI Responses API content blocks
            if (block.type === "input_text") {
                if (block.text) blocks.push({ type: "text", text: block.text });
            } else {
                const url = block.image_url || "";
                const m = url.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/s);
                if (m) {
                    blocks.push({
                        type: "image",
                        source: { type: "base64", media_type: m[1], data: m[2] },
                    });
                }
            }
        }
    }
    return blocks;
}

function openAiToolToZed(tool) {
    if (!tool) return null;
    const fn = tool.function || tool;
    return {
        name: fn.name,
        description: fn.description,
        input_schema: fn.parameters || fn.input_schema || { type: "object", properties: {} },
    };
}

function openAiMessagesToZed(messages, verbose) {
    const zed = [];
    const systemParts = [];
    for (const m of messages || []) {
        if (!m) continue;
        if (m.role === "system") {
            const text = typeof m.content === "string"
                ? m.content
                : (m.content || []).map((b) => b.text || "").join("");
            if (text) systemParts.push(text);
            continue;
        }
        if (m.role === "user") {
            zed.push({ role: "user", content: openAiContentToZedBlocks(m.content, verbose) });
        } else if (m.role === "assistant") {
            const blocks = [];
            const textBlocks = openAiContentToZedBlocks(m.content, verbose);
            if (textBlocks.length) blocks.push(...textBlocks);
            for (const tc of m.tool_calls || []) {
                blocks.push({
                    type: "tool_use",
                    id: tc.id || uuid(),
                    name: tc.function?.name,
                    input: safeJsonParse(tc.function?.arguments) || {},
                });
            }
            if (blocks.length) zed.push({ role: "assistant", content: blocks });
        } else if (m.role === "tool") {
            let text = "";
            if (typeof m.content === "string") text = m.content;
            else if (Array.isArray(m.content)) text = m.content.map((b) => b.text ?? "").join("");
            else if (m.content) text = JSON.stringify(m.content);
            zed.push({
                role: "user",
                content: [{
                    type: "tool_result",
                    tool_use_id: m.tool_call_id,
                    content: [{ type: "text", text: text || "" }],
                    is_error: false,
                }],
            });
        } else {
            zed.push({ role: m.role === "assistant" ? "assistant" : "user", content: openAiContentToZedBlocks(m.content, verbose) });
        }
    }
    return { messages: zed, system: systemParts.join("\n\n") };
}

function safeJsonParse(str) {
    if (!str) return null;
    try {
        return JSON.parse(str);
    } catch {
        return null;
    }
}

function buildZedPayload(body, args) {
    const modelId = normalizeModelId(body.model || DEFAULT_MODEL);
    const model = resolveModel(modelId);
    if (!model) {
        const err = new Error(
            `Unknown model "${body.model}". Available models: ${Object.keys(ZED_MODELS).join(", ")}`
        );
        err.status = 400;
        throw err;
    }

    const { messages, system } = openAiMessagesToZed(body.messages, args.verbose);

    let tools;
    if (Array.isArray(body.tools)) {
        tools = body.tools.map(openAiToolToZed).filter(Boolean);
    }

    const maxTokens = body.max_tokens || body.max_completion_tokens || model.output || 64000;
    const temperature = body.temperature ?? 1.0;
    const systemPrompt =
        system +
        `\n\n## Tool Protocol\n- Use native tool_use API only.\n- NEVER output XML tags like <tool_use>.\n- The user already sees tool output. Do not repeat it.`;

    const providerRequest = {
        model: modelId,
        max_tokens: maxTokens,
        messages,
        ...(tools && tools.length > 0 && { tools }),
        system: systemPrompt,
    };

    return {
        thread_id: uuid(),
        prompt_id: uuid(),
        intent: "user_prompt",
        provider: model.provider,
        model: modelId,
        provider_request: providerRequest,
        system: systemPrompt,
        temperature,
    };
}

// ---------------------------------------------------------------------------
// Zed stream -> OpenAI SSE
// ---------------------------------------------------------------------------

function zedHeaders(token, version) {
    return {
        accept: "*/*",
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
        "user-agent": `Zed/${version} (linux; x86_64)`,
        "x-zed-client-supports-status-messages": "true",
        "x-zed-client-supports-stream-ended-request-completion-status": "true",
        "x-zed-version": version,
    };
}

function openAiChunk(payload) {
    return `data: ${JSON.stringify(payload)}\n\n`;
}

/**
 * Convert Zed's NDJSON event stream into OpenAI chat.completions SSE.
 * Returns a ReadableStream; finishReason/usage accumulate for non-stream callers.
 */
function zedStreamToOpenAIStream(zedResponse, onStats) {
    const reader = zedResponse.body.getReader();
    const decoder = new TextDecoder();
    const encoder = new TextEncoder();

    let currentToolCall = null;
    let roleSent = false;
    let finishReason = "stop";
    let usage = null;
    const id = `chatcmpl-${uuid()}`;

    return new ReadableStream({
        async start(controller) {
            let buffer = "";
            const send = (obj) => controller.enqueue(encoder.encode(openAiChunk(obj)));

            const maybeFinishTool = () => {
                if (currentToolCall) {
                    send({
                        id,
                        object: "chat.completion.chunk",
                        created: Math.floor(Date.now() / 1000),
                        model: currentToolCall.model,
                        choices: [{
                            index: 0,
                            delta: {
                                tool_calls: [{
                                    index: currentToolCall.index,
                                    id: currentToolCall.id,
                                    type: "function",
                                    function: {
                                        name: currentToolCall.name,
                                        arguments: currentToolCall.arguments,
                                    },
                                }],
                            },
                        }],
                    });
                    currentToolCall = null;
                }
            };

            try {
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    buffer += decoder.decode(value, { stream: true });
                    const lines = buffer.split("\n");
                    buffer = lines.pop() || "";

                    for (const rawLine of lines) {
                        const line = rawLine.trim();
                        if (!line) continue;
                        let json;
                        try {
                            json = JSON.parse(line);
                        } catch {
                            continue;
                        }

                        if (json.status === "stream_ended") {
                            maybeFinishTool();
                            if (onStats) onStats({ finishReason, usage, id });
                            controller.enqueue(encoder.encode("data: [DONE]\n\n"));
                            return;
                        }

                        const event = json.event;
                        if (!event) continue;

                        if (event.type === "message_start") {
                            usage = event.message?.usage ?? null;
                            if (!roleSent) {
                                roleSent = true;
                                send({
                                    id,
                                    object: "chat.completion.chunk",
                                    created: Math.floor(Date.now() / 1000),
                                    model: event.message?.model || "",
                                    choices: [{ index: 0, delta: { role: "assistant" }, finish_reason: null }],
                                });
                            }
                        } else if (event.type === "content_block_start" && event.content_block?.type === "tool_use") {
                            currentToolCall = {
                                index: event.index ?? 0,
                                id: event.content_block.id || uuid(),
                                name: event.content_block.name,
                                arguments: "",
                                model: "",
                            };
                            // Zed sends an empty `input: {}` placeholder on start;
                            // only seed from it when it actually carries a payload.
                            const input = event.content_block.input;
                            if (input && typeof input === "object" && Object.keys(input).length > 0) {
                                currentToolCall.arguments += JSON.stringify(input);
                            }
                        } else if (event.type === "content_block_delta" && event.delta?.partial_json) {
                            if (currentToolCall) currentToolCall.arguments += event.delta.partial_json;
                        } else if (event.type === "content_block_delta" && event.delta?.text) {
                            send({
                                id,
                                object: "chat.completion.chunk",
                                created: Math.floor(Date.now() / 1000),
                                model: currentToolCall?.model || "",
                                choices: [{ index: 0, delta: { content: event.delta.text }, finish_reason: null }],
                            });
                        } else if (event.type === "content_block_stop") {
                            maybeFinishTool();
                        } else if (event.type === "message_delta") {
                            if (event.usage) usage = event.usage;
                            if (event.delta?.stop_reason) {
                                finishReason = event.delta.stop_reason === "tool_use" ? "tool_calls" : "stop";
                            }
                        } else if (event.type === "message_stop") {
                            maybeFinishTool();
                            send({
                                id,
                                object: "chat.completion.chunk",
                                created: Math.floor(Date.now() / 1000),
                                model: "",
                                choices: [{ index: 0, delta: {}, finish_reason: finishReason }],
                            });
                        }
                    }
                }
                maybeFinishTool();
                if (onStats) onStats({ finishReason, usage, id });
                controller.enqueue(encoder.encode("data: [DONE]\n\n"));
            } catch (err) {
                controller.error(err);
            } finally {
                try { await reader.cancel(); } catch { /* ignore */ }
                controller.close();
            }
        },
    });
}

// ---------------------------------------------------------------------------
// HTTP handlers
// ---------------------------------------------------------------------------

function json(res, status, body) {
    const payload = JSON.stringify(body);
    res.writeHead(status, {
        "content-type": "application/json; charset=utf-8",
        "content-length": Buffer.byteLength(payload),
    });
    res.end(payload);
}

function openAiError(status, message, type = "zed_error", code = null) {
    return { error: { message, type, param: null, code } };
}

async function handleModels(res) {
    json(res, 200, {
        object: "list",
        data: Object.entries(ZED_MODELS).map(([id, m]) => ({
            id,
            object: "model",
            created: 0,
            owned_by: m.provider === "open_ai" ? "openai" : m.provider,
            context_window: m.context,
            max_tokens: m.output,
            supports_reasoning: m.supportsReasoning,
            supports_images: m.supportsImages,
            supports_tools: m.supportsTools,
        })),
    });
}

async function handleChatCompletions(req, res, tokenManager, args) {
    let raw = "";
    for await (const chunk of req) raw += chunk;

    let body;
    try {
        body = JSON.parse(raw || "{}");
    } catch {
        return json(res, 400, openAiError(400, "Invalid JSON body"));
    }

    let zedPayload;
    try {
        zedPayload = buildZedPayload(body, args);
    } catch (err) {
        return json(res, err.status || 400, openAiError(err.status || 400, err.message));
    }

    const stream = body.stream === true;
    const modelId = normalizeModelId(body.model || DEFAULT_MODEL);

    const doRequest = async (token) => {
        const zedRes = await fetch(args.endpoint, {
            method: "POST",
            headers: zedHeaders(token, args.version),
            body: JSON.stringify(zedPayload),
        });

        if (!zedRes.ok) {
            const text = await zedRes.text();
            let detail = text;
            try {
                const parsed = JSON.parse(text);
                detail = parsed.message || parsed.error?.message || text;
            } catch { /* keep raw text */ }
            if (zedRes.status === 401) {
                detail =
                    "Zed token expired or you are signed out. Run `zed2cli token` to mint a fresh token " +
                    "(or `zed2cli daemon install` to keep it refreshed), then retry. Upstream said: " + detail;
            } else if (zedRes.status === 451) {
                detail =
                    "Zed geo-blocked this request from your network egress. Run `zed2cli geo-check`. " +
                    "Upstream said: " + detail;
            }
            return { error: { status: zedRes.status, detail } };
        }
        return { response: zedRes };
    };

    let result = await doRequest(tokenManager.get());

    if (result.error?.status === 401 && tokenManager.refresh) {
        const refreshed = await tokenManager.refresh();
        if (refreshed) result = await doRequest(tokenManager.get());
    }

    if (result.error) {
        if (stream) {
            res.writeHead(result.error.status, { "content-type": "text/event-stream; charset=utf-8" });
            res.end(openAiChunk(openAiError(result.error.status, result.error.detail)));
        } else {
            json(res, result.error.status, openAiError(result.error.status, result.error.detail));
        }
        return;
    }

    const zedRes = result.response;

    if (stream) {
        res.writeHead(200, {
            "content-type": "text/event-stream; charset=utf-8",
            "cache-control": "no-cache",
            connection: "keep-alive",
        });
        const sse = zedStreamToOpenAIStream(zedRes, null);
        const reader = sse.getReader();
        try {
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                res.write(value);
            }
        } catch (err) {
            // Mid-stream failure: tell the client instead of hanging.
            try {
                res.write(openAiChunk(openAiError(500, `stream error: ${err.message}`)));
                res.write("data: [DONE]\n\n");
            } catch { /* response already closing */ }
        } finally {
            res.end();
        }
        return;
    }

    // Non-streaming: buffer the SSE and assemble the final message.
    const textParts = [];
    let finishReason = "stop";
    let usage = null;
    let toolCalls = [];
    const chunks = zedStreamToOpenAIStream(zedRes, (stats) => {
        finishReason = stats.finishReason;
        usage = stats.usage;
    });
    const reader = chunks.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let readError = null;
    try {
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            for (const line of buffer.split("\n")) {
                if (!line.startsWith("data: ")) continue;
                const data = line.slice(6);
                if (data === "[DONE]") continue;
                let chunk;
                try { chunk = JSON.parse(data); } catch { continue; }
                for (const choice of chunk.choices || []) {
                    if (choice.delta?.content) textParts.push(choice.delta.content);
                    if (choice.delta?.tool_calls) {
                        // Accumulate by index so multi-tool responses keep every call.
                        for (const tc of choice.delta.tool_calls) {
                            toolCalls[tc.index ?? toolCalls.length] = tc;
                        }
                    }
                    if (choice.finish_reason) finishReason = choice.finish_reason;
                }
            }
            buffer = buffer.slice(buffer.lastIndexOf("\n") + 1);
        }
    } catch (err) {
        readError = err;
    } finally {
        reader.releaseLock();
    }
    if (readError) {
        return json(res, 500, openAiError(500, `stream error: ${readError.message}`));
    }

    const message = { role: "assistant", content: textParts.join("") || null };
    if (toolCalls.length) {
        message.tool_calls = toolCalls
            .filter(Boolean)
            .map((tc) => ({
                id: tc.id,
                type: "function",
                function: { name: tc.function?.name, arguments: tc.function?.arguments || "{}" },
            }));
    }

    json(res, 200, {
        id: `chatcmpl-${uuid()}`,
        object: "chat.completion",
        created: Math.floor(Date.now() / 1000),
        model: modelId,
        choices: [{ index: 0, message, finish_reason: finishReason }],
        usage: usage
            ? {
                  prompt_tokens: usage.input_tokens ?? 0,
                  completion_tokens: usage.output_tokens ?? 0,
                  total_tokens: (usage.input_tokens ?? 0) + (usage.output_tokens ?? 0),
              }
            : undefined,
    });
}

// ---------------------------------------------------------------------------
// Server
// ---------------------------------------------------------------------------

async function main() {
    const args = parseArgs(process.argv.slice(2));
    const tokenManager = createTokenManager(args);
    await tokenManager.loadInitial();

    const server = http.createServer(async (req, res) => {
        const url = new URL(req.url, `http://${req.headers.host}`);
        const path = url.pathname;
        try {
            if (path === "/v1/models" || path === "/models") {
                await handleModels(res);
            } else if (path === "/v1/chat/completions" || path === "/v1/chatCompletion") {
                await handleChatCompletions(req, res, tokenManager, args);
            } else if (path === "/v1/responses" || path === "/v1/responses/") {
                json(res, 501, openAiError(501, "OpenAI Responses API is not supported by the Zed bridge; use /v1/chat/completions."));
            } else if (path === "/health" || path === "/") {
                json(res, 200, {
                    ok: true,
                    service: "zed-open bridge proxy",
                    endpoint: args.endpoint,
                    models: Object.keys(ZED_MODELS).length,
                    tokenSource: process.env.ZED_TOKEN
                        ? "env"
                        : args.tokenFile
                          ? "file"
                          : args.tokenScript
                            ? "script"
                            : "none",
                    token: describeExpiry(tokenManager.get()),
                    defaultModel: DEFAULT_MODEL,
                });
            } else {
                json(res, 404, openAiError(404, `Not found: ${path}`));
            }
        } catch (err) {
            console.error(`[zed-proxy] error handling ${path}:`, err);
            try {
                json(res, 500, openAiError(500, `Internal proxy error: ${err.message}`));
            } catch { /* response already sent */ }
        }
    });

    server.listen(args.port, args.host, () => {
        console.log(`[zed-proxy] listening on http://${args.host}:${args.port}`);
        console.log(`[zed-proxy] forwarding to ${args.endpoint}`);
        console.log(`[zed-proxy] models served: ${Object.keys(ZED_MODELS).length} (${Object.keys(ZED_MODELS).join(", ")})`);
        if (args.tokenScript) {
            console.log(`[zed-proxy] token: via script (auto-refresh on expiry) "${args.tokenScript}"`);
        } else if (process.env.ZED_TOKEN) {
            console.log("[zed-proxy] token: from ZED_TOKEN env");
        } else {
            console.log(`[zed-proxy] token: from file ${args.tokenFile}`);
        }
    });
}

main().catch((err) => {
    console.error("[zed-proxy] fatal:", err);
    process.exit(1);
});
