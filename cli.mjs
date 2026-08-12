#!/usr/bin/env node
/**
 * zed2cli — CLI entry point.
 *
 * Dispatches to the bash tooling shipped in this package. Everything is
 * zero-dependency (plain node:child_process) so `npx zed2cli` / `bunx zed2cli`
 * work without any install step.
 */
import { spawn, spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

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
  console.log(`zed2cli v${pkg.version} — doctor`);
  console.log("");

  const has = (name) => {
    const r = spawnSync("bash", ["-c", `command -v ${name}`], { encoding: "utf8" });
    return r.status === 0 && r.stdout.trim().length > 0 ? r.stdout.trim() : null;
  };

  console.log("Environment:");
  console.log(`  node   : ${process.version}`);
  for (const tool of ["bash", "curl", "jq", "opencode", "pi", "secret-tool"]) {
    const p = has(tool);
    console.log(`  ${tool.padEnd(9)}: ${p ? p : "✘ not found"}`);
  }

  console.log("\nToken:");
  const r = spawnSync("bash", [sh("zed-token"), "--raw"], { encoding: "utf8" });
  const tok = (r.stdout || "").trim();
  const src =
    (r.stderr || "")
      .split("\n")
      .find((l) => l.includes("source:"))
      ?.trim() || "no source (check stderr)";
  if (tok && r.status === 0) {
    console.log(`  ✔ resolved (${tok.length} chars) — ${src}`);
  } else {
    console.log(`  ✘ could not resolve a token — ${src}`);
    console.log('    fix: run `zed2cli token --save-access-token -` (server) or sign in to Zed (keyring)');
  }

  console.log("\nNetwork egress:");
  console.log("  run `zed2cli geo-check` for the full geo-block diagnosis.");
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
