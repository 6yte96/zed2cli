/**
 * Canonical model catalog for Zed-hosted AI models (cloud.zed.dev).
 *
 * Verified on 2026-08-12 against `GET https://cloud.zed.dev/models`
 * using a `token_based_zed_student` session token. This list is
 * authoritative for that plan — the previous hardcoded list used
 * wrong model IDs (e.g. `gpt-5-2` instead of `gpt-5.2`) and a wrong
 * provider name (`openai` instead of `open_ai`), which made every
 * non-Anthropic model fail.
 *
 * Refresh the catalog any time with:
 *   curl -s https://cloud.zed.dev/models -H "authorization: Bearer $ZED_TOKEN"
 */

export const ZED_ENDPOINT = "https://cloud.zed.dev/completions";
export const ZED_MODELS_URL = "https://cloud.zed.dev/models";
export const ZED_VERSION =
    "0.228.0+stable.203.8421009ef8a022df1196d54bb42fd94366ec0988";

export const DEFAULT_MODEL = "claude-sonnet-4-6";

/**
 * @typedef {Object} ZedModel
 * @property {string} name        Display name
 * @property {string} provider    Zed provider key: anthropic | google | open_ai | x_ai
 * @property {number} context     Max context (input) tokens
 * @property {number} output      Max output tokens
 * @property {boolean} supportsReasoning
 * @property {boolean} supportsImages
 * @property {boolean} supportsTools
 * @property {boolean} latest     is_latest in the Zed catalog
 */

/** @type {Record<string, ZedModel>} */
export const ZED_MODELS = {
    // ---- Anthropic -------------------------------------------------------
    "claude-sonnet-5": {
        name: "Claude Sonnet 5",
        provider: "anthropic",
        context: 1000000,
        output: 128000,
        supportsReasoning: true,
        supportsImages: true,
        supportsTools: true,
        latest: true,
    },
    "claude-sonnet-4-6": {
        name: "Claude Sonnet 4.6",
        provider: "anthropic",
        context: 1000000,
        output: 64000,
        supportsReasoning: true,
        supportsImages: true,
        supportsTools: true,
        latest: false,
    },
    "claude-sonnet-4-5": {
        name: "Claude Sonnet 4.5",
        provider: "anthropic",
        context: 200000,
        output: 8192,
        supportsReasoning: true,
        supportsImages: true,
        supportsTools: true,
        latest: false,
    },
    "claude-haiku-4-5": {
        name: "Claude Haiku 4.5",
        provider: "anthropic",
        context: 200000,
        output: 64000,
        supportsReasoning: true,
        supportsImages: true,
        supportsTools: true,
        latest: false,
    },

    // ---- OpenAI (note: provider key is "open_ai", IDs use dots) -----------
    "gpt-5.6-sol": {
        name: "GPT-5.6 Sol",
        provider: "open_ai",
        context: 400000,
        output: 128000,
        supportsReasoning: true,
        supportsImages: true,
        supportsTools: true,
        latest: true,
    },
    "gpt-5.6-terra": {
        name: "GPT-5.6 Terra",
        provider: "open_ai",
        context: 400000,
        output: 128000,
        supportsReasoning: true,
        supportsImages: true,
        supportsTools: true,
        latest: false,
    },
    "gpt-5.6-luna": {
        name: "GPT-5.6 Luna",
        provider: "open_ai",
        context: 400000,
        output: 128000,
        supportsReasoning: true,
        supportsImages: true,
        supportsTools: true,
        latest: false,
    },
    "gpt-5.5": {
        name: "GPT-5.5",
        provider: "open_ai",
        context: 400000,
        output: 128000,
        supportsReasoning: true,
        supportsImages: true,
        supportsTools: true,
        latest: false,
    },
    "gpt-5.4": {
        name: "GPT-5.4",
        provider: "open_ai",
        context: 400000,
        output: 128000,
        supportsReasoning: true,
        supportsImages: true,
        supportsTools: true,
        latest: false,
    },
    "gpt-5.3-codex": {
        name: "GPT-5.3-Codex",
        provider: "open_ai",
        context: 400000,
        output: 128000,
        supportsReasoning: true,
        supportsImages: true,
        supportsTools: true,
        latest: false,
    },
    "gpt-5.2": {
        name: "GPT-5.2",
        provider: "open_ai",
        context: 400000,
        output: 128000,
        supportsReasoning: false,
        supportsImages: true,
        supportsTools: true,
        latest: false,
    },
    "gpt-5-mini": {
        name: "GPT-5 mini",
        provider: "open_ai",
        context: 400000,
        output: 128000,
        supportsReasoning: false,
        supportsImages: true,
        supportsTools: true,
        latest: false,
    },
    "gpt-5-nano": {
        name: "GPT-5 nano",
        provider: "open_ai",
        context: 400000,
        output: 128000,
        supportsReasoning: false,
        supportsImages: true,
        supportsTools: true,
        latest: false,
    },

    // ---- Google -----------------------------------------------------------
    "gemini-3.1-pro-preview": {
        name: "Gemini 3.1 Pro",
        provider: "google",
        context: 200000,
        output: 65535,
        supportsReasoning: true,
        supportsImages: true,
        supportsTools: true,
        latest: true,
    },
    "gemini-3.5-flash": {
        name: "Gemini 3.5 Flash",
        provider: "google",
        context: 1048576,
        output: 65535,
        supportsReasoning: true,
        supportsImages: true,
        supportsTools: true,
        latest: true,
    },
    "gemini-3-flash": {
        name: "Gemini 3 Flash",
        provider: "google",
        context: 1048576,
        output: 65535,
        supportsReasoning: true,
        supportsImages: true,
        supportsTools: true,
        latest: false,
    },
};

/**
 * Normalize a model id the way CLI agents usually write it:
 *   "zed-ai/claude-sonnet-4-6" -> "claude-sonnet-4-6"
 *   "claude-sonnet-4-6"        -> "claude-sonnet-4-6"
 */
export function normalizeModelId(id) {
    if (!id) return "";
    const str = String(id);
    const idx = str.indexOf("/");
    return idx === -1 ? str : str.slice(idx + 1);
}

/** Resolve a model id (with or without provider prefix) to its catalog entry, or null. */
export function resolveModel(id) {
    return ZED_MODELS[normalizeModelId(id)] ?? null;
}

/** Zed provider key (anthropic | google | open_ai | x_ai) for a model id. */
export function zedProviderFor(id) {
    return resolveModel(id)?.provider ?? null;
}
