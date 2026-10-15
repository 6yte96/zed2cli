#!/usr/bin/env node
/**
 * zed2cli — CLI entry point.
 *
 * Dispatches to the bash tooling shipped in this package. Everything is
 * zero-dependency (plain node:child_process) so `npx zed2cli` / `bunx zed2cli`
 * work without any install step.
 */
import { spawn, spawnSync } from "node:child_process";
import { readFileSync, existsSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import os from "node:os";
import path from "node:path";
import { jwtInfo, describeExpiry } from "./src/models.mjs";

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const sh = (name) => path.join(ROOT, "scripts", `${name}.sh`);
const pkg = JSON.parse(readFileSync(path.join(ROOT, "package.json"), "utf8"));

const HELP = `zed2cli v${pkg.version} — use Zed-hosted AI models from any CLI agent.

USAGE
  zed2cli <command> [args]

COMMANDS
  install-opencode [--skip-config]   Install the opencode plugin + wire opencode.json
  install-pi                         Register the zed-ai provider with pi
  proxy [node-proxy-args]            Start the OpenAI-compatible bridge proxy
  token [opts]                       Zed JWT helper (--raw, --save, --export-access-token,
                                     --save-access-token [FILE|-], -h)
  daemon <start|stop|status|install|uninstall>
                                     JWT refresh daemon (nohup or systemd user service)
  geo-check                          Diagnose geo-blocking (egress IP + cf-ray edge)
  doctor                             Environment + token + network diagnostic
  help | --help | -h                 Show this help
  version | --version | -v           Print version

EXAMPLES
  zed2cli install-opencode            # then: opencode providers login --provider zed-ai
  zed2cli proxy                       # OpenAI-compatible on http://127.0.0.1:8787/v1
  zed2cli daemon install              # auto-refresh the JWT every ~50 min
  zed2cli token --export-access-token # refreshable token for a server (one-time paste)
  zed2cli geo-check                   # is my network egress geo-blocked?

INSTALL
  npm i -g zed2cli        # or:  bun add -g zed2cli
  npx zed2cli geo-check   # or:  bunx zed2cli doctor   (no install needed)

NOTE
  The tooling shells out to bash scripts (Linux/macOS). On Windows use WSL or Git Bash.
`;

function run(cmd, args) {
  const child = spawn(cmd, args, { stdio: "inherit" });
  child.on("error", (err) => {
    if (err.code === "ENOENT") {
      console.error(
        `zed2cli: "${cmd}" was not found. ${
          cmd === "bash"
            ? "On Windows use WSL or Git Bash; on Linux/macOS install bash."
            : "Install it and try again."
        }`
      );
      process.exit(1);
    }
    throw err;
  });
  for (const sig of ["SIGINT", "SIGTERM"]) process.on(sig, () => child.kill(sig));
  child.on("exit", (code, signal) => process.exit(code ?? (signal ? 1 : 0)));
}

function doctor() {
  console.log(`zed2cli v${pkg.version} doctor`);
  console.log("");

  const which = (name) => {
    const r = spawnSync("bash", ["-c", `command -v ${name}`], { encoding: "utf8" });
    return r.status === 0 && r.stdout.trim() ? r.stdout.trim() : null;
  };

  const home = os.homedir();
  const xdgData = process.env.XDG_DATA_HOME || path.join(home, ".local", "share");
  const xdgConfig = process.env.XDG_CONFIG_HOME || path.join(home, ".config");

  const detectApi = (source) => {
    if (/Plugin\.define/.test(source) || /setup\s*\(\s*ctx/.test(source)) return "v2";
    if (/config\s*:/.test(source) || /auth\s*:/.test(source)) return "v1";
    return "unknown";
  };

  // --- environment ---------------------------------------------------------
  let opencodeMajor = null;
  console.log("Environment:");
  console.log(`  ${"node".padEnd(11)}: ${process.version}`);
  for (const tool of ["bash", "curl", "jq", "opencode", "pi", "secret-tool"]) {
    const p = which(tool);
    if (tool === "opencode" && p) {
      const v = (spawnSync("opencode", ["--version"], { encoding: "utf8" }).stdout || "").trim();
      opencodeMajor = Number((v.match(/(\d+)/) || [])[1]) || null;
      console.log(`  ${tool.padEnd(11)}: ${v}${opencodeMajor >= 2 ? "  (plugin API v2)" : ""}`);
    } else {
      console.log(`  ${tool.padEnd(11)}: ${p || "not found"}`);
    }
  }

  // --- token sources -------------------------------------------------------
  console.log("");
  console.log("Token sources:");

  const reportToken = (label, raw) => {
    const token = (raw || "").trim();
    if (!token) {
      console.log(`  ${label.padEnd(18)}: not set`);
      return;
    }
    const info = jwtInfo(token);
    const who = info?.user ? `  (user ${info.user})` : "";
    console.log(`  ${label.padEnd(18)}: ${describeExpiry(token)}${who}`);
  };

  reportToken("ZED_TOKEN env", process.env.ZED_TOKEN);

  const r = spawnSync("bash", [sh("zed-token"), "--raw"], { encoding: "utf8" });
  const resolved = (r.stdout || "").trim();
  const source = (r.stderr || "")
    .split("\n")
    .find((l) => l.includes("source:"))
    ?.replace(/^\[token\]\s*source:\s*/, "")
    .trim();
  if (resolved && r.status === 0) {
    reportToken("keyring/resolver", resolved);
    if (source) console.log(`  ${"".padEnd(18)}  from: ${source}`);
  } else {
    console.log(`  ${"keyring/resolver".padEnd(18)}: could not resolve a token`);
  }

  const jwtFile = process.env.ZED_TOKEN_FILE || path.join(home, ".zed_jwt_token");
  if (existsSync(jwtFile)) reportToken(path.basename(jwtFile), readFileSync(jwtFile, "utf8"));
  else console.log(`  ${path.basename(jwtFile).padEnd(18)}: not found`);

  const accessFile = process.env.ZED_ACCESS_TOKEN_FILE || path.join(home, ".zed_access_token");
  console.log(
    `  ${".zed_access_token".padEnd(18)}: ${existsSync(accessFile) ? "present (refreshable)" : "not found"}`
  );

  const authPath = path.join(xdgData, "opencode", "auth.json");
  try {
    const key = JSON.parse(readFileSync(authPath, "utf8"))?.["zed-ai"]?.key;
    if (key) reportToken("opencode zed-ai", key.replace(/^Bearer\s+/i, ""));
    else console.log(`  ${"opencode zed-ai".padEnd(18)}: not logged in`);
  } catch {
    console.log(`  ${"opencode zed-ai".padEnd(18)}: no auth.json`);
  }

  // --- integration ---------------------------------------------------------
  console.log("");
  console.log("Integration:");

  const cfgPath = path.join(xdgConfig, "opencode", "opencode.json");
  let pluginFile = null;
  try {
    const cfg = JSON.parse(readFileSync(cfgPath, "utf8"));
    const list = cfg.plugins || cfg.plugin || [];
    const entries = (Array.isArray(list) ? list : [list])
      .map((e) => (typeof e === "string" ? e : e?.package))
      .filter(Boolean);
    const zed = entries.find((p) => /zed/i.test(p));
    if (zed) {
      pluginFile = zed.startsWith("/") ? zed : path.resolve(path.dirname(cfgPath), zed);
    }
  } catch {
    /* no opencode config yet */
  }

  // OpenCode 2 registers a plugin directory; OpenCode 1 registers a file.
  if (pluginFile && existsSync(pluginFile)) {
    try {
      if (statSync(pluginFile).isDirectory()) pluginFile = path.join(pluginFile, "index.mjs");
    } catch {
      /* keep as is */
    }
  }

  let api = "not configured";
  if (pluginFile) {
    try {
      api = detectApi(readFileSync(pluginFile, "utf8"));
    } catch {
      api = "referenced but missing";
    }
  } else {
    const defaultFile = path.join(xdgConfig, "opencode", "node_modules", "opencode-zed-ai", "index.mjs");
    if (existsSync(defaultFile)) {
      api = detectApi(readFileSync(defaultFile, "utf8")) + " (not referenced in opencode.json)";
    }
  }

  console.log(`  opencode plugin   : ${api}`);
  if (opencodeMajor >= 2 && api.startsWith("v1")) {
    console.log("    MISMATCH: this plugin is for the OpenCode v1 API, but OpenCode v2 is installed.");
    console.log("    The zed-ai provider will not load. Use the proxy provider, or update the plugin.");
  }

  const health = spawnSync("curl", ["-s", "-m", "2", "http://127.0.0.1:8787/health"], { encoding: "utf8" });
  const up = (health.stdout || "").includes("\"ok\":true");
  console.log(`  bridge proxy 8787 : ${up ? "running" : "not running (start: zed2cli proxy)"}`);

  console.log("");
  console.log("Egress: run `zed2cli geo-check` for the full geo-block diagnosis.");
  console.log("");
}

const [, , cmd, ...rest] = process.argv;

switch (cmd) {
  case undefined:
  case "help":
  case "--help":
  case "-h":
    console.log(HELP);
    break;
  case "version":
  case "--version":
  case "-v":
    console.log(pkg.version);
    break;
  case "install-opencode":
    run("bash", [sh("install-opencode"), ...rest]);
    break;
  case "install-pi":
    run("bash", [sh("install-pi"), ...rest]);
    break;
  case "proxy":
    run("bash", [sh("zed-proxy"), ...rest]);
    break;
  case "token":
    run("bash", [sh("zed-token"), ...rest]);
    break;
  case "daemon":
    run("bash", [sh("zed-refresh-daemon"), ...rest]);
    break;
  case "geo-check":
    run("bash", [sh("geo-check"), ...rest]);
    break;
  case "doctor":
    doctor();
    break;
  default:
    console.error(`zed2cli: unknown command "${cmd}"`);
    console.error("");
    console.log(HELP);
    process.exit(1);
}
