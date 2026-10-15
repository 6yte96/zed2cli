/**
 * zed2cli OpenCode plugin (OpenCode V2).
 *
 * Registers a `zed-ai` provider with OpenCode and bridges OpenAI chat
 * completions to Zed's proprietary `cloud.zed.dev/completions` endpoint in
 * process, so no proxy process is needed.
 *
 * How it works on OpenCode V2:
 *   - Providers are contributed with `ctx.provider.transform(...)`.
 *   - The OpenAI request is rewritten into Zed's `provider_request` envelope
 *     in a `http.request` session hook, and pointed at Zed's endpoint.
 *   - Zed's newline delimited JSON event stream is translated back into
 *     OpenAI server sent events in a `http.response` hook.
 *
 * Token sources, in order:
 *   1. ZED_TOKEN environment variable (ignored when already expired)
 *   2. ZED_TOKEN_SCRIPT, or a bundled scripts/zed-token.sh, or `zed2cli token --raw`
 *   3. ZED_TOKEN_FILE, or ~/.zed_jwt_token
 *
 * Environment overrides:
 *   ZED_DEBUG       set to 1 to log bridge activity to stderr
 *   ZED_ENDPOINT    completions endpoint (default https://cloud.zed.dev/completions)
 *   ZED_VERSION     Zed version header
 */
import crypto from "node:crypto";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";

import { Plugin, Provider, Model } from "@opencode/plugin";
import { ZED_MODELS, ZED_ENDPOINT, ZED_VERSION, DEFAULT_MODEL, resolveModel, jwtInfo } from "./models.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DEBUG = /^(1|true|yes)$/i.test(process.env.ZED_DEBUG || "");
const log = (msg) => {
  if (DEBUG) console.error(`[zed-ai] ${msg}`);
};

const uuid = () => crypto.randomUUID();
const normalizeToken = (raw) => (raw || "").trim().replace(/^Bearer\s+/i, "").replace(/\s+/g, "");

let cachedToken = null;
let cachedExp = 0;

function readTokenFile() {
  const file = process.env.ZED_TOKEN_FILE || path.join(os.homedir(), ".zed_jwt_token");
  try {
    return normalizeToken(readFileSync(file, "utf8"));
  } catch {
    return "";
  }
}

function runTokenCli() {
  const bundled = path.join(HERE, "zed-token.sh");
  const script = process.env.ZED_TOKEN_SCRIPT;
  const candidates = [];
  if (script) candidates.push(script);
  else if (existsSync(bundled)) candidates.push(`bash ${bundled} --raw`);
  candidates.push("zed2cli token --raw");
  for (const cmd of candidates) {
    try {
      const out = execFileSync("bash", ["-lc", cmd], {
        timeout: 20_000,
        // Never let a stale exported token win inside the resolver.
        env: { ...process.env, ZED_TOKEN: "" },
      }).toString();
      const tok = normalizeToken(out.split(/\r?\n/).filter(Boolean).pop() || "");
      if (tok) return tok;
    } catch {
      /* try the next source */
    }
  }
  return "";
}

function resolveToken() {
  const now = Date.now();
  if (cachedToken && cachedExp && cachedExp - 60_000 > now) return cachedToken;

  let tok = normalizeToken(process.env.ZED_TOKEN);
  if (tok && jwtInfo(tok)?.expired) {
    log("ZED_TOKEN is expired, ignoring it");
    tok = "";
  }
  if (!tok) tok = runTokenCli();
  if (!tok) tok = readTokenFile();

  cachedToken = tok;
  cachedExp = jwtInfo(tok)?.exp ? jwtInfo(tok).exp * 1000 : 0;
  log(tok ? `token resolved (${jwtInfo(tok)?.expired ? "EXPIRED" : "valid"})` : "no token resolved");
  return tok;
}

const safeJsonParse = (s) => {
  if (!s) return null;
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
};

function contentToBlocks(content) {
  if (typeof content === "string") return content ? [{ type: "text", text: content }] : [];
  if (!Array.isArray(content)) return [];
  return content
    .map((b) => {
      if (!b) return null;
      if (b.type === "text") return { type: "text", text: b.text || "" };
      if (b.type === "image_url") {
        const url = b.image_url?.url || "";
        const m = url.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/s);
        return m ? { type: "image", source: { type: "base64", media_type: m[1], data: m[2] } } : null;
      }
      return b;
    })
    .filter(Boolean);
}

function normalizeMessages(messages) {
  const clean = [];
  for (const m of messages || []) {
    if (!m) continue;
    if (m.role === "system") continue;
    if (m.role === "user") {
      clean.push({ role: "user", content: contentToBlocks(m.content) });
    } else if (m.role === "assistant") {
      const blocks = contentToBlocks(m.content);
      for (const tc of m.tool_calls || []) {
        blocks.push({
          type: "tool_use",
          id: tc.id || uuid(),
          name: tc.function?.name,
          input: safeJsonParse(tc.function?.arguments) || {},
        });
      }
      if (blocks.length) clean.push({ role: "assistant", content: blocks });
    } else if (m.role === "tool") {
      let text = "";
      if (typeof m.content === "string") text = m.content;
      else if (Array.isArray(m.content)) text = m.content.map((b) => b.text ?? "").join("");
      else if (m.content) text = JSON.stringify(m.content);
      clean.push({
        role: "user",
        content: [
          {
            type: "tool_result",
            tool_use_id: m.tool_call_id,
            content: [{ type: "text", text: text || "" }],
            is_error: false,
          },
        ],
      });
    }
  }
  return clean;
}

function buildZedPayload(body) {
  const { messages = [], system, tools, max_tokens, temperature } = body;
  const model = resolveModel(body.model) ? body.model : DEFAULT_MODEL;
  const modelInfo = ZED_MODELS[model];

  let cleanTools;
  if (Array.isArray(tools)) {
    cleanTools = tools
      .map((t) => {
        const fn = t.function || t;
        return {
          name: fn.name,
          description: fn.description,
          input_schema: fn.parameters || fn.input_schema || { type: "object", properties: {} },
        };
      })
      .filter((t) => t.name);
  }

  const systemPrompt = system || "";
  return {
    thread_id: uuid(),
    prompt_id: uuid(),
    intent: "user_prompt",
    provider: modelInfo.provider,
    model,
    provider_request: {
      model,
      max_tokens: max_tokens || modelInfo.output || 64000,
      messages: normalizeMessages(messages),
      ...(cleanTools && cleanTools.length > 0 && { tools: cleanTools }),
      system: systemPrompt,
    },
    system: systemPrompt,
    temperature: temperature || 1.0,
  };
}

/** Translate Zed's NDJSON event stream into OpenAI chat.completions SSE. */
function zedStreamToOpenAI(zedBody) {
  const reader = zedBody.getReader();
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  const id = `chatcmpl-${uuid()}`;
  let roleSent = false;
  let currentToolCall = null;
  let finishReason = "stop";

  return new ReadableStream({
    async start(controller) {
      let buffer = "";
      const send = (o) => controller.enqueue(encoder.encode(`data: ${JSON.stringify(o)}\n\n`));
      const finishTool = () => {
        if (!currentToolCall) return;
        send({
          id,
          object: "chat.completion.chunk",
          created: Math.floor(Date.now() / 1000),
          model: "",
          choices: [
            {
              index: 0,
              delta: {
                tool_calls: [
                  {
                    index: currentToolCall.index,
                    id: currentToolCall.id,
                    type: "function",
                    function: { name: currentToolCall.name, arguments: currentToolCall.arguments },
                  },
                ],
              },
            },
          ],
        });
        currentToolCall = null;
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
            const event = json.event;
            if (!event) continue;

            if (event.type === "message_start") {
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
              };
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
                model: "",
                choices: [{ index: 0, delta: { content: event.delta.text }, finish_reason: null }],
              });
            } else if (event.type === "content_block_stop") {
              finishTool();
            } else if (event.type === "message_delta" && event.delta?.stop_reason) {
              finishReason = event.delta.stop_reason === "tool_use" ? "tool_calls" : "stop";
            } else if (event.type === "message_stop") {
              finishTool();
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
        finishTool();
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      } catch (err) {
        controller.error(err);
      } finally {
        controller.close();
      }
    },
  });
}

function friendlyError(status, message) {
  if (status === 401) {
    return (
      "Zed token expired or you are signed out. Run `zed2cli token` to mint a fresh one " +
      "(or `zed2cli daemon install` to keep it refreshed), then retry. Upstream said: " +
      message
    );
  }
  if (status === 451) {
    return "Zed geo-blocked this request from your network egress. Run `zed2cli geo-check`. Upstream said: " + message;
  }
  return message;
}

function registerProvider(ctx) {
  const pid = Provider.ID.make("zed-ai");
  return ctx.provider.transform((editor) => {
    editor.add({
      info: {
        ...Provider.Info.empty(pid),
        name: "Zed AI",
        activation: "enabled",
        package: "@opencode/ai/providers/openai-compatible",
        settings: { baseURL: "https://cloud.zed.dev" },
      },
      models: Object.entries(ZED_MODELS).map(([id, m]) => ({
        ...Model.Info.default(pid, Model.ID.make(id)),
        name: m.name,
        capabilities: {
          tools: m.supportsTools,
          input: ["text", ...(m.supportsImages ? ["image"] : [])],
          output: ["text"],
        },
        limit: { context: m.context, output: m.output },
        cost: [],
      })),
    });
  });
}

export default Plugin.define({
  id: "zed-ai",
  async setup(ctx) {
    await registerProvider(ctx);
    log(`registered provider zed-ai with ${Object.keys(ZED_MODELS).length} models`);

    await ctx.session.hook(
      "http.request",
      async (event) => {
        try {
          const original = JSON.parse(await event.request.clone().text());
          const zed = buildZedPayload(original);
          const token = resolveToken();
          event.request = new Request(process.env.ZED_ENDPOINT || ZED_ENDPOINT, {
            method: "POST",
            headers: {
              accept: "*/*",
              authorization: `Bearer ${token}`,
              "content-type": "application/json",
              "user-agent": `Zed/${process.env.ZED_VERSION || ZED_VERSION}`,
              "x-zed-client-supports-status-messages": "true",
              "x-zed-client-supports-stream-ended-request-completion-status": "true",
              "x-zed-version": process.env.ZED_VERSION || ZED_VERSION,
            },
            body: JSON.stringify(zed),
          });
        } catch (err) {
          log(`http.request failed: ${err.message}`);
        }
      },
      { providerID: "zed-ai" }
    );

    await ctx.session.hook(
      "http.response",
      async (event) => {
        try {
          if (event.response.status !== 200) {
            const text = await event.response.clone().text();
            let detail = text;
            try {
              const parsed = JSON.parse(text);
              detail = parsed.message || parsed.error?.message || text;
            } catch {
              /* keep raw text */
            }
            log(`upstream error ${event.response.status}: ${detail}`);
            event.response = new Response(
              JSON.stringify({ error: { message: friendlyError(event.response.status, detail), type: "zed_error" } }),
              { status: event.response.status, headers: { "content-type": "application/json" } }
            );
            return;
          }
          event.response = new Response(zedStreamToOpenAI(event.response.body), {
            status: 200,
            headers: { "content-type": "text/event-stream" },
          });
        } catch (err) {
          log(`http.response failed: ${err.message}`);
        }
      },
      { providerID: "zed-ai" }
    );
    log("hooks registered");
  },
});
