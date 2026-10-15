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

/**
 * Decode a JWT payload without verifying the signature. We only ever use this
 * to read `exp`, `plan`, and the user name for diagnostics. Returns null when
 * the value is not a decodable JWT.
 */
export function decodeJwt(token) {
    if (!token || typeof token !== "string") return null;
    const parts = token.trim().split(".");
    if (parts.length < 2) return null;
    try {
        const b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
        const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
        const json = Buffer.from(padded, "base64").toString("utf8");
        const payload = JSON.parse(json);
        return payload && typeof payload === "object" ? payload : null;
    } catch {
        return null;
    }
}

/**
 * Expiry and identity for a Zed JWT, or null when it is not a JWT.
 * `expired` is null when the token carries no `exp` claim.
 * @returns {{ exp: number|null, expiresAt: Date|null, expired: boolean|null, plan: string|null, user: string|null }|null}
 */
export function jwtInfo(token) {
    const payload = decodeJwt(token);
    if (!payload) return null;
    const exp = typeof payload.exp === "number" ? payload.exp : null;
    return {
        exp,
        expiresAt: exp ? new Date(exp * 1000) : null,
        expired: exp ? exp * 1000 <= Date.now() : null,
        plan: payload.plan ?? null,
        user: payload.github_user_login ?? payload.username ?? null,
    };
}

/** Human friendly one line expiry summary for a token. */
export function describeExpiry(token) {
    const info = jwtInfo(token);
    if (!info) return "not a JWT";
    if (!info.exp) return "no expiry claim";
    const mins = Math.round(Math.abs(info.exp * 1000 - Date.now()) / 60000);
    if (info.expired) {
        const days = Math.floor(mins / 1440);
        return days >= 1 ? `EXPIRED ${days} day(s) ago` : `EXPIRED ${mins} min ago`;
    }
    return `valid for ${mins} min`;
}

/** Zed provider key (anthropic | google | open_ai | x_ai) for a model id. */
export function zedProviderFor(id) {
    return resolveModel(id)?.provider ?? null;
}
