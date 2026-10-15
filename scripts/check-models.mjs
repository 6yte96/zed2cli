/**
 * Guard: the pi extension carries its own inline copy of the model catalog
 * because pi loads extensions from a virtual URL where relative imports do
 * not resolve. This script fails when that copy drifts from the canonical
 * `src/models.mjs`.
 *
 * Run directly (`node scripts/check-models.mjs`) or through
 * `npm run prepublishOnly`, which the publish workflow and `npm publish` both
 * invoke.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

import { ZED_MODELS } from "../src/models.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PI_FILE = path.join(HERE, "..", "src", "pi", "zed-ai.mjs");

function parseInlineModels(source) {
    const block = source.match(/const ZED_MODELS = \[([\s\S]*?)\];/);
    if (!block) return null;
    return [...block[1].matchAll(/\{([^}]*)\}/g)].map((match) => {
        const entry = {};
        for (const field of match[1].split(",")) {
            const pair = field.match(/^\s*([A-Za-z_]+)\s*:\s*(.+?)\s*$/);
            if (!pair) continue;
            const [, key, raw] = pair;
            let value = raw;
            if (/^".*"$/.test(raw)) value = raw.slice(1, -1);
            else if (raw === "true") value = true;
            else if (raw === "false") value = false;
            else if (/^\d+$/.test(raw)) value = Number(raw);
            entry[key] = value;
        }
        return entry;
    });
}

// pi field name -> canonical field name
const FIELD_MAP = [
    ["name", "name"],
    ["supportsReasoning", "reasoning"],
    ["supportsImages", "images"],
    ["context", "context"],
    ["output", "output"],
];

const piEntries = parseInlineModels(readFileSync(PI_FILE, "utf8"));
if (!piEntries) {
    console.error("[check-models] could not find the inline ZED_MODELS list in src/pi/zed-ai.mjs");
    process.exit(1);
}

const problems = [];
const canonicalIds = Object.keys(ZED_MODELS);
const piIds = piEntries.map((entry) => entry.id);

for (const id of canonicalIds) {
    if (!piIds.includes(id)) problems.push(`missing from the pi list: ${id}`);
}
for (const id of piIds) {
    if (!canonicalIds.includes(id)) problems.push(`extra in the pi list: ${id}`);
}

for (const entry of piEntries) {
    const canonical = ZED_MODELS[entry.id];
    if (!canonical) continue;
    for (const [canonicalKey, piKey] of FIELD_MAP) {
        if (canonical[canonicalKey] !== entry[piKey]) {
            problems.push(
                `${entry.id}.${piKey}: pi=${JSON.stringify(entry[piKey])} canonical=${JSON.stringify(canonical[canonicalKey])}`
            );
        }
    }
}

if (problems.length > 0) {
    console.error("[check-models] src/pi/zed-ai.mjs is out of sync with src/models.mjs:");
    for (const problem of problems) console.error(`  ${problem}`);
    process.exit(1);
}

console.log(`[check-models] ok: ${canonicalIds.length} models match src/models.mjs`);
