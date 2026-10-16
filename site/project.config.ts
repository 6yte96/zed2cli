/**
 * ============================================================================
 * zed2cli LANDING PAGE CONFIGURATION
 *
 * This is the single file that drives the page content. Values here are
 * copied from the repository, so the numbers and paths stay honest:
 *
 *   1. No dummy data. Every number, link, and claim must be real and
 *      verifiable from the repository. Count with a script, do not estimate.
 *   2. Write like a human. No em dashes, no dot separators, no arrows.
 *      Use commas, periods, and plain words.
 *   3. Sample terminal sessions are allowed as demonstrations, but the
 *      commands, paths, and formats must match what the tool really does.
 *
 * Source of the counts and flags: src/models.mjs (16 models), package.json
 * (no runtime dependencies), scripts/zed-refresh-daemon.sh (50 minute loop).
 * ============================================================================
 */

export interface ProjectConfig {
  meta: {
    title: string;
    description: string;
    keywords: string[];
    url: string;
    author: string;
    /** shown in footer version line, e.g. "v2.0.0" */
    version: string;
  };
  brand: {
    name: string;
    domainSuffix: string;
    tagline: string;
    handle: string;
  };
  /** nav carries only what matters to the reader. 4 items max plus the
   *  GitHub link, which is added automatically. Each id must match a
   *  section id on the page. */
  nav: {
    id: string;
    label: string;
  }[];
  hero: {
    /** the only metadata worth showing, e.g. "v2.0.0" */
    issueBadge: string;
    titleLines: {
      before: string;
      highlight: string;
      after: string;
    };
    description: string;
    primaryCta: {
      text: string;
      href: string;
    };
    secondaryCta: {
      text: string;
      href: string;
    };
  };
  install: {
    defaultManager: string;
    managers: Record<string, string>;
  };
  telemetry: {
    label: string;
    updatedText: string;
    /** 3 to 4 real stats. These render in the hero press-run card. */
    stats: {
      number: string;
      label: string;
    }[];
  };
  features: {
    id: string;
    bentoClass: "bento-xl" | "bento-tall" | "bento-md" | "bento-wide" | "bento-lg" | "bento-sm";
    category: string;
    tech: string;
    title: string;
    description: string;
    /** real path shown in the card footer link */
    repoLinkText?: string;
    /** deep link to the actual source; falls back to links.github */
    repoHref?: string;
    /** the tilted corner stamp. label plus a REAL value. */
    stamp: {
      label: string;
      value: string;
    };
    /** one short real fact, e.g. "node 18 or newer" */
    meta: string;
    tilt: "tilt-up" | "tilt-down";
  }[];
  codePlayground: {
    title: string;
    filename: string;
    language: string;
    tabs: {
      id: string;
      label: string;
      filename: string;
      code: string;
    }[];
  };
  /** the model catalog table, filled from src/models.mjs */
  models: {
    title: string;
    subtitle: string;
    headers: string[];
    rows: {
      name: string;
      isTarget?: boolean;
      metrics: string[];
      highlight?: boolean;
    }[];
    /** one honest line about where these numbers come from */
    note: string;
    pill: string;
  };
  architecture: {
    title: string;
    subtitle: string;
    layers: {
      /** the tilted tag, e.g. "PARSER" */
      tag: string;
      /** clean heading */
      name: string;
      /** plain sentence about what this part does */
      role: string;
    }[];
  };
  support: {
    heading: string;
    text: string;
    /** shown in the stamp and footer, e.g. "MIT" */
    license: string;
    /** for the meta line time element, e.g. "2026" */
    year: string;
    starLabel: string;
    sponsorLabel: string;
    shareTitle: string;
  };
  /** where the package is published and where this page lives */
  publish: {
    version: string;
    npmUrl: string;
    pagesUrl: string;
    node: string;
    license: string;
    updated: string;
    note?: string;
  };
  links: {
    github: string;
    docs: string;
    pages?: string;
    discord?: string;
    twitter?: string;
    npm?: string;
    portfolio?: string;
    /** when set, the Sponsor buttons render with this link */
    sponsor?: string;
  };
}

const GITHUB = "https://github.com/6yte96/zed2cli";
const BLOB = `${GITHUB}/blob/main`;

export const PROJECT_CONFIG: ProjectConfig = {
  meta: {
    title: "zed2cli: use your Zed hosted models from any CLI agent",
    description:
      "Bridge the AI models in your Zed account into OpenCode, pi, Hermes, or any OpenAI compatible CLI through your Zed subscription, without running the Zed editor.",
    keywords: [
      "zed",
      "zed ai",
      "opencode plugin",
      "pi extension",
      "hermes",
      "openai compatible",
      "llm bridge",
      "cli",
    ],
    url: "https://6yte96.github.io/zed2cli/",
    author: "6yte96",
    version: "v2.0.0",
  },
  brand: {
    name: "zed2cli",
    domainSuffix: "",
    tagline: "Your Zed subscription, reachable from the terminal",
    handle: "6yte96",
  },
  nav: [
    { id: "architecture", label: "Bridge" },
    { id: "playground", label: "Session" },
    { id: "features", label: "Capabilities" },
    { id: "models", label: "Models" },
  ],
  hero: {
    issueBadge: "v2.0.0",
    titleLines: {
      before: "Use your Zed plan",
      highlight: "from any CLI agent",
      after: "without the editor",
    },
    description:
      "zed2cli bridges the AI models in your Zed account to OpenCode, pi, Hermes, and any tool that speaks the OpenAI API. It runs on your machine and talks to cloud.zed.dev for you.",
    primaryCta: {
      text: "See a Session",
      href: "#playground",
    },
    secondaryCta: {
      text: "View GitHub Repo",
      href: GITHUB,
    },
  },
  install: {
    defaultManager: "npm",
    managers: {
      npm: "npm install -g zed2cli",
      bun: "bun add -g zed2cli",
      pnpm: "pnpm add -g zed2cli",
      npx: "npx zed2cli doctor",
    },
  },
  telemetry: {
    label: "At a Glance",
    updatedText: "Catalog verified against cloud.zed.dev, v2.0.0",
    stats: [
      { number: "16", label: "Zed Models" },
      { number: "0", label: "Runtime Deps" },
      { number: "50", label: "Min Token Refresh" },
    ],
  },
  features: [
    {
      id: "opencode-plugin",
      bentoClass: "bento-xl",
      category: "OPENCODE",
      tech: "PLUGIN API V1 AND V2",
      title: "Runs inside OpenCode",
      description:
        "The installer detects your OpenCode major version and copies the matching plugin. On OpenCode 2 the zed-ai provider registers through the in process plugin API, so no extra process is needed.",
      repoLinkText: "src/index.mjs",
      repoHref: `${BLOB}/src/index.mjs`,
      stamp: { label: "PROVIDER", value: "zed-ai" },
      meta: "opencode 2 needs 2.0 or newer",
      tilt: "tilt-up",
    },
    {
      id: "bridge-proxy",
      bentoClass: "bento-tall",
      category: "PROXY",
      tech: "OPENAI COMPATIBLE",
      title: "Local OpenAI bridge",
      description:
        "Point pi, Hermes, or any OpenAI compatible client at http://127.0.0.1:8787/v1. The proxy rewrites each request into the Zed envelope and streams the answer back as server sent events.",
      repoLinkText: "src/proxy.mjs",
      repoHref: `${BLOB}/src/proxy.mjs`,
      stamp: { label: "PORT", value: "8787" },
      meta: "binds to 127.0.0.1 by default",
      tilt: "tilt-down",
    },
    {
      id: "pi-extension",
      bentoClass: "bento-md",
      category: "PI",
      tech: "PI EXTENSION",
      title: "pi provider in one command",
      description:
        "zed2cli install-pi registers the zed-ai provider with pi and points it at the local proxy. The extension carries its own model list because pi loads extensions from a virtual URL.",
      repoLinkText: "src/pi/zed-ai.mjs",
      repoHref: `${BLOB}/src/pi/zed-ai.mjs`,
      stamp: { label: "COMMAND", value: "install-pi" },
      meta: "reads ZED_PROXY_URL",
      tilt: "tilt-up",
    },
    {
      id: "token-refresh",
      bentoClass: "bento-wide",
      category: "TOKENS",
      tech: "JWT AND KEYRING",
      title: "Tokens stay fresh",
      description:
        "A Zed JWT lasts about an hour. The refresh daemon keeps a live token in ~/.zed_jwt_token every 50 minutes, and every command, the plugin, and the proxy read it from there.",
      repoLinkText: "scripts/zed-refresh-daemon.sh",
      repoHref: `${BLOB}/scripts/zed-refresh-daemon.sh`,
      stamp: { label: "REFRESH LOOP", value: "50 min" },
      meta: "nohup or a systemd user service",
      tilt: "tilt-down",
    },
    {
      id: "doctor",
      bentoClass: "bento-sm",
      category: "DIAGNOSTICS",
      tech: "CLI",
      title: "doctor tells the truth",
      description:
        "One command lists every token source with its expiry, checks whether the plugin matches your OpenCode version, and reports whether the proxy is running.",
      repoLinkText: "cli.mjs",
      repoHref: `${BLOB}/cli.mjs`,
      stamp: { label: "CHECK", value: "doctor" },
      meta: "flags expired tokens plainly",
      tilt: "tilt-up",
    },
    {
      id: "catalog",
      bentoClass: "bento-lg",
      category: "CATALOG",
      tech: "SHARED MODULE",
      title: "One source of truth",
      description:
        "src/models.mjs lists all 16 models with their provider key, context size, output size, and capability flags. The plugin and the proxy both import it, and a check fails the build when the pi copy drifts.",
      repoLinkText: "src/models.mjs",
      repoHref: `${BLOB}/src/models.mjs`,
      stamp: { label: "MODELS", value: "16" },
      meta: "checked by npm run check-models",
      tilt: "tilt-down",
    },
  ],
  codePlayground: {
    title: "From install to a running agent",
    filename: "session.sh",
    language: "shell",
    tabs: [
      {
        id: "opencode",
        label: "OpenCode",
        filename: "opencode, plugin install",
        code: `$ npm install -g zed2cli
$ zed2cli install-opencode
  detected OpenCode 2.0.29
  installed the plugin for the v2 API

$ opencode models | grep zed-ai
  zed-ai/claude-sonnet-4-6
  zed-ai/gpt-5.6-sol
  zed-ai/gemini-3.5-flash
  ... 13 more

$ opencode run -m zed-ai/claude-sonnet-4-6 "say hello in one word"
  hello`,
      },
      {
        id: "proxy",
        label: "pi and Hermes",
        filename: "proxy, openai bridge",
        code: `$ zed2cli proxy
  bridge listening on http://127.0.0.1:8787/v1

# in another shell
$ zed2cli install-pi
  registered the zed-ai provider with pi

$ pi --list-models | grep zed-ai
  zed-ai/claude-sonnet-4-6
  zed-ai/gpt-5.6-sol
  ... 14 more

$ curl -s http://127.0.0.1:8787/v1/models | jq '.data[].id'
  "claude-sonnet-4-6"
  "gpt-5.6-sol"
  ... 14 more`,
      },
      {
        id: "doctor",
        label: "doctor",
        filename: "zed2cli doctor",
        code: `$ zed2cli doctor

Token sources:
  ZED_TOKEN env     : not set
  keyring/resolver  : valid for 60 min  (user 6yte96)
                      from: keyring (auto-refresh OK)
  .zed_jwt_token    : EXPIRED 49 day(s) ago  (user 6yte96)
  opencode zed-ai   : EXPIRED 63 day(s) ago  (user 6yte96)

Integration:
  opencode plugin   : v2
  bridge proxy 8787 : not running (start: zed2cli proxy)`,
      },
    ],
  },
  models: {
    title: "Models in the Zed Catalog",
    subtitle:
      "Every model below was read from GET https://cloud.zed.dev/models with a Zed Student plan token. Other plans may expose a different list.",
    headers: ["Model", "Provider", "Context", "Max Output", "Reasoning"],
    rows: [
      {
        name: "Claude Sonnet 5",
        metrics: ["Anthropic", "1,000,000", "128,000", "yes"],
      },
      {
        name: "Claude Sonnet 4.6",
        isTarget: true,
        highlight: true,
        metrics: ["Anthropic", "1,000,000", "64,000", "yes"],
      },
      {
        name: "Claude Sonnet 4.5",
        metrics: ["Anthropic", "200,000", "8,192", "yes"],
      },
      {
        name: "Claude Haiku 4.5",
        metrics: ["Anthropic", "200,000", "64,000", "yes"],
      },
      {
        name: "GPT-5.6 Sol",
        metrics: ["OpenAI", "400,000", "128,000", "yes"],
      },
      {
        name: "GPT-5.6 Terra",
        metrics: ["OpenAI", "400,000", "128,000", "yes"],
      },
      {
        name: "GPT-5.6 Luna",
        metrics: ["OpenAI", "400,000", "128,000", "yes"],
      },
      {
        name: "GPT-5.5",
        metrics: ["OpenAI", "400,000", "128,000", "yes"],
      },
      {
        name: "GPT-5.4",
        metrics: ["OpenAI", "400,000", "128,000", "yes"],
      },
      {
        name: "GPT-5.3-Codex",
        metrics: ["OpenAI", "400,000", "128,000", "yes"],
      },
      {
        name: "GPT-5.2",
        metrics: ["OpenAI", "400,000", "128,000", "no"],
      },
      {
        name: "GPT-5 mini",
        metrics: ["OpenAI", "400,000", "128,000", "no"],
      },
      {
        name: "GPT-5 nano",
        metrics: ["OpenAI", "400,000", "128,000", "no"],
      },
      {
        name: "Gemini 3.1 Pro",
        metrics: ["Google", "200,000", "65,535", "yes"],
      },
      {
        name: "Gemini 3.5 Flash",
        metrics: ["Google", "1,048,576", "65,535", "yes"],
      },
      {
        name: "Gemini 3 Flash",
        metrics: ["Google", "1,048,576", "65,535", "yes"],
      },
    ],
    note: "All 16 models support tools and images. Reasoning is the supportsReasoning flag from src/models.mjs. The default model is claude-sonnet-4-6.",
    pill: "Catalog Verified",
  },
  architecture: {
    title: "How the bridge works",
    subtitle:
      "Zed speaks its own protocol. zed2cli translates both directions. These are the files a contributor would touch.",
    layers: [
      {
        tag: "PLUGIN",
        name: "OpenCode plugin",
        role: "src/index.mjs registers the zed-ai provider through the OpenCode 2 plugin API and rewrites requests in process. src/index.v1.mjs is the OpenCode 1 build, and the installer copies whichever one matches your version.",
      },
      {
        tag: "BRIDGE",
        name: "Proxy and pi",
        role: "src/proxy.mjs serves GET /v1/models and POST /v1/chat/completions, translates each request, and forwards it to cloud.zed.dev. src/pi/zed-ai.mjs points pi at that proxy through ZED_PROXY_URL.",
      },
      {
        tag: "CATALOG",
        name: "Shared model catalog",
        role: "src/models.mjs is the single source of truth for the 16 models, their provider keys, and their capability flags. The plugin and the proxy both import it.",
      },
      {
        tag: "TOKENS",
        name: "Token resolution",
        role: "scripts/zed-token.sh resolves a JWT from ZED_TOKEN, the system keyring, ~/.zed_access_token, or ~/.zed_jwt_token. The refresh daemon keeps the file current so long runs do not expire.",
      },
    ],
  },
  support: {
    heading: "Keep the bridge open",
    text: "zed2cli is MIT licensed and built in the open. If it saved you from writing a proxy of your own, star the repo or pass it on to another engineer.",
    license: "MIT",
    year: "2026",
    starLabel: "Star on GitHub",
    sponsorLabel: "Sponsor",
    shareTitle: "zed2cli, use your Zed hosted models from any CLI agent",
  },
  publish: {
    version: "2.0.0",
    npmUrl: "https://www.npmjs.com/package/zed2cli",
    pagesUrl: "https://6yte96.github.io/zed2cli/",
    node: "18 or newer",
    license: "MIT",
    updated: "2026-10",
  },
  links: {
    github: GITHUB,
    docs: "https://github.com/6yte96/zed2cli#readme",
    pages: "https://6yte96.github.io/zed2cli/",
    npm: "https://www.npmjs.com/package/zed2cli",
    portfolio: "https://6yte96.me",
  },
};
