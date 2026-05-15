/**
 * @type {import('@opencode-ai/plugin').Plugin}
 */
import crypto from "node:crypto";

export async function ZedAiPlugin({ client }) {
    const ZED_ENDPOINT = "https://cloud.zed.dev/completions";
    const ZED_VERSION = "0.228.0+stable.203.8421009ef8a022df1196d54bb42fd94366ec0988";
    const ZED_MODELS = {
        "claude-sonnet-4-6": {
            name: "Claude Sonnet 4.6 (Zed Student)",
            provider: "anthropic",
            context: 1000000,
            output: 64000,
            supportsReasoning: true,
        },
        "claude-sonnet-4-5": {
            name: "Claude Sonnet 4.5 (Zed Student)",
            provider: "anthropic",
            context: 200000,
            output: 64000,
            supportsReasoning: true,
        },
        "claude-haiku-4-5": {
            name: "Claude Haiku 4.5 (Zed Student)",
            provider: "anthropic",
            context: 200000,
            output: 64000,
            supportsReasoning: false,
        },
        "gpt-5-5": {
            name: "GPT-5.5 (Zed Student)",
            provider: "openai",
            context: 400000,
            output: 128000,
            supportsReasoning: true,
        },
        "gpt-5-4": {
            name: "GPT-5.4 (Zed Student)",
            provider: "openai",
            context: 400000,
            output: 128000,
            supportsReasoning: true,
        },
        "gpt-5-3-codex": {
            name: "GPT-5.3-Codex (Zed Student)",
            provider: "openai",
            context: 400000,
            output: 128000,
            supportsReasoning: true,
        },
        "gpt-5-2": {
            name: "GPT-5.2 (Zed Student)",
            provider: "openai",
            context: 400000,
            output: 128000,
            supportsReasoning: true,
        },
        "gpt-5-2-codex": {
            name: "GPT-5.2-Codex (Zed Student)",
            provider: "openai",
            context: 400000,
            output: 128000,
            supportsReasoning: true,
        },
        "gpt-5-mini": {
            name: "GPT-5 mini (Zed Student)",
            provider: "openai",
            context: 400000,
            output: 128000,
            supportsReasoning: true,
        },
        "gpt-5-nano": {
            name: "GPT-5 nano (Zed Student)",
            provider: "openai",
            context: 400000,
            output: 128000,
            supportsReasoning: true,
        },
        "gemini-3-1-pro": {
            name: "Gemini 3.1 Pro (Zed Student)",
            provider: "google",
            context: 200000,
            output: 64000,
            supportsReasoning: true,
        },
        "gemini-3-flash": {
            name: "Gemini 3 Flash (Zed Student)",
            provider: "google",
            context: 200000,
            output: 64000,
            supportsReasoning: true,
        },
        "grok-4": {
            name: "Grok 4 (Zed Student)",
            provider: "x_ai",
            context: 128000,
            output: 64000,
            supportsReasoning: true,
        },
        "grok-4-fast": {
            name: "Grok 4 Fast (Zed Student)",
            provider: "x_ai",
            context: 128000,
            output: 64000,
            supportsReasoning: true,
        },
        "grok-4-fast-non-reasoning": {
            name: "Grok 4 Fast Non-Reasoning (Zed Student)",
            provider: "x_ai",
            context: 128000,
            output: 64000,
            supportsReasoning: false,
        },
        "grok-code-fast-1": {
            name: "Grok Code Fast 1 (Zed Student)",
            provider: "x_ai",
            context: 256000,
            output: 64000,
            supportsReasoning: false,
        },
    };

    function buildZedPayload(originalBody) {
        const { messages = [], system, tools, max_tokens, temperature } = originalBody;
        const model = originalBody.model && ZED_MODELS[originalBody.model]
            ? originalBody.model
            : "claude-sonnet-4-6";
        const modelInfo = ZED_MODELS[model];

        // 1. Map Tools to Anthropic Schema (Inside provider_request)
        let cleanTools;
        if (Array.isArray(tools)) {
            cleanTools = tools.map(t => ({
                name: t.name || t.id,
                description: t.description,
                input_schema: t.input_schema || t.parameters
            })).filter(t => t.name);
        }

        // 2. Normalize Messages (Must be sequence)
        const cleanMessages = messages
            .filter(m => m.role === "user" || m.role === "assistant")
            .map(m => {
                let content = m.content;
                if (typeof content === "string") {
                    content = [{ type: "text", text: content }];
                } else if (Array.isArray(content)) {
                    content = content.map(block => {
                        if ((block.type === "tool_use" || block.type === "tool") && !block.name) {
                            return {
                                type: "tool_use",
                                id: block.id || block.callID || crypto.randomUUID(),
                                name: block.tool || block.name,
                                input: block.input || block.args || {}
                            };
                        }
                        if (block.type === "tool_result" && !block.tool_use_id) {
                            return {
                                type: "tool_result",
                                tool_use_id: block.id || block.callID || block.tool_use_id,
                                content: [{
                                    type: "text",
                                    text: typeof block.output === "string" ? block.output : JSON.stringify(block.output || block.content || "")
                                }]
                            };
                        }
                        return block;
                    });
                }
                return { role: m.role, content };
            });

        // 3. Match EXACT JSON structure from trace (Root-level + Provider Request)
        const systemPrompt = (system || "") + `
\n\n## Tool Protocol
- You have access to: terminal, read_file, edit_file, grep, list_directory, find_path, create_directory, delete_path, move_path, copy_path, now, open, fetch, web_search.
- Use native tool_use API only.
- NEVER output XML tags like <tool_use>.
- The user already sees tool output. Do not repeat it.
- End every response with an 'Automatic Checklist' (- [ ]).`;

        return {
            thread_id: crypto.randomUUID(),
            prompt_id: crypto.randomUUID(),
            intent: "user_prompt",
            provider: modelInfo.provider,
            model,
            provider_request: {
                model,
                max_tokens: max_tokens || 64000,
                messages: cleanMessages,
                ...(cleanTools && cleanTools.length > 0 && { tools: cleanTools }),
                // TRACE MATCH: System is also accepted inside provider_request in some Zed versions
                system: systemPrompt 
            },
            // TRACE MATCH: Root level system as a string
            system: systemPrompt,
            temperature: temperature || 1.0
        };
    }

    return {
        config: async (config) => {
            config.provider = config.provider || {};
            config.provider["zed-ai"] = {
                name: "Zed AI",
                api: "anthropic",
                models: Object.fromEntries(Object.entries(ZED_MODELS).map(([id, model]) => [
                    id,
                    {
                        name: model.name,
                        limit: { context: model.context, output: model.output },
                        capabilities: {
                            temperature: true, reasoning: model.supportsReasoning, attachment: true, toolcall: true,
                            input: { text: true, image: true, pdf: true },
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
                if (!info || info.type !== "api") return {};

                return {
                    baseURL: "https://cloud.zed.dev",
                    apiKey: info.key,

                    async fetch(input, init) {
                        const token = info.key.trim().replace(/\s+/g, "");
                        let originalBody = typeof init.body === "string" ? JSON.parse(init.body) : init.body;
                        const zedPayload = buildZedPayload(originalBody);

                        const headers = new Headers();
                        headers.set("accept", "*/*");
                        headers.set("authorization", `Bearer ${token}`);
                        headers.set("content-type", "application/json");
                        headers.set("user-agent", `Zed/${ZED_VERSION} (windows; x86_64)`);
                        headers.set("x-zed-client-supports-status-messages", "true");
                        headers.set("x-zed-client-supports-stream-ended-request-completion-status", "true");
                        headers.set("x-zed-version", ZED_VERSION);

                        const response = await fetch(ZED_ENDPOINT, {
                            method: "POST",
                            headers,
                            body: JSON.stringify(zedPayload)
                        });

                        if (!response.ok) return response;

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
                                                }
                                                else if (event.type === "content_block_delta" && event.delta?.text) {
                                                    chunk = { choices: [{ delta: { content: event.delta.text } }] };
                                                } else if (event.type === "message_start") {
                                                    chunk = { choices: [{ delta: { role: "assistant" } }] };
                                                } else if (event.type === "message_delta" && event.delta?.stop_reason) {
                                                    chunk = { choices: [{ finish_reason: event.delta.stop_reason === "tool_use" ? "tool_calls" : "stop", delta: {} }] };
                                                }

                                                if (chunk) {
                                                    controller.enqueue(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`));
                                                }
                                            } catch (e) {}
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
                };
            },
            methods: [
                {
                    type: "api",
                    label: "Login with Zed Session Token",
                    prompts: [
                        {
                            type: "text",
                            key: "zedToken",
                            message: "Enter your intercepted Zed Session Token (eyJ...)",
                            validate: (value) => {
                                const token = (value || "").trim().replace(/^Bearer\s+/i, "");
                                if (!token.startsWith("eyJ")) {
                                    return "Invalid token format. Paste a JWT starting with 'eyJ' or an Authorization header starting with 'Bearer eyJ'.";
                                }
                                return undefined;
                            }
                        }
                    ],
                    async authorize(inputs) {
                        return {
                            type: "success",
                            key: (inputs.zedToken || "").trim().replace(/^Bearer\s+/i, "").replace(/\s+/g, ""),
                            expires: Date.now() + (1000 * 60 * 60 * 24 * 365)
                        };
                    }
                }
            ]
        }
    };
}

export const server = ZedAiPlugin;
export default ZedAiPlugin;
