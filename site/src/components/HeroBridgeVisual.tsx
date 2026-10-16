"use client";

import { useState, useEffect } from "react";
import { PROJECT_CONFIG } from "@/config";

type AgentId = "opencode" | "pi" | "openai";

interface AgentPreset {
  id: AgentId;
  name: string;
  badge: string;
  mode: string;
  transport: string;
  command: string;
  hookDetail: string;
}

const AGENT_PRESETS: AgentPreset[] = [
  {
    id: "opencode",
    name: "OpenCode",
    badge: "v2 Plugin",
    mode: "In-Process Hook",
    transport: "Memory IPC (no proxy)",
    command: 'opencode run -m zed-ai/claude-sonnet-4-6 "optimize parser"',
    hookDetail: 'ctx.session.hook("http.request") ➔ rewrites envelope',
  },
  {
    id: "pi",
    name: "Pi Agent",
    badge: "Extension",
    mode: "Local Proxy",
    transport: "HTTP 127.0.0.1:8787",
    command: 'pi --provider zed-ai --model zed-ai/gpt-5.6-sol "refactor bridge"',
    hookDetail: "pi.registerProvider() ➔ OpenAI SSE adapter",
  },
  {
    id: "openai",
    name: "Hermes / CLI",
    badge: "OpenAI API",
    mode: "Bridge Proxy",
    transport: "HTTP 127.0.0.1:8787/v1",
    command: 'curl -s http://127.0.0.1:8787/v1/chat/completions -d \'{"model":"gemini-3.5-flash"}\'',
    hookDetail: "POST /v1/chat/completions ➔ NDJSON stream",
  },
];

interface ModelOption {
  id: string;
  label: string;
  provider: "Anthropic" | "OpenAI" | "Google";
  context: string;
  sampleStream: string[];
}

const FEATURED_MODELS: ModelOption[] = [
  {
    id: "claude-sonnet-4-6",
    label: "Claude Sonnet 4.6",
    provider: "Anthropic",
    context: "1M tokens",
    sampleStream: [
      "event: message_start (role: assistant)",
      "content_block_start: text",
      "delta: 'Reading token cache from ~/.zed_jwt_token...'",
      "delta: ' Verified valid for 50 min. Connecting stream.'",
      "delta: ' -> Translated OpenAI request to cloud.zed.dev.'",
      "event: stream_ended (HTTP 200 OK)",
    ],
  },
  {
    id: "gpt-5.6-sol",
    label: "GPT-5.6 Sol",
    provider: "OpenAI",
    context: "400K tokens",
    sampleStream: [
      "event: message_start (model: gpt-5.6-sol)",
      "content_block_start: text",
      "delta: 'Resolved credentials via system keyring.'",
      "delta: ' Transformed tool_use schema into provider_request.'",
      "delta: ' -> Streaming response chunks to terminal.'",
      "event: stream_ended (HTTP 200 OK)",
    ],
  },
  {
    id: "gemini-3.5-flash",
    label: "Gemini 3.5 Flash",
    provider: "Google",
    context: "1M tokens",
    sampleStream: [
      "event: message_start (model: gemini-3.5-flash)",
      "content_block_start: text",
      "delta: 'cf-ray edge verification passed.'",
      "delta: ' Zero runtime dependencies active.'",
      "delta: ' -> Completed tool call loop without Zed GUI.'",
      "event: stream_ended (HTTP 200 OK)",
    ],
  },
];

export function HeroBridgeVisual() {
  const { telemetry, links } = PROJECT_CONFIG;
  const [activeAgent, setActiveAgent] = useState<AgentId>("opencode");
  const [activeModelId, setActiveModelId] = useState<string>("claude-sonnet-4-6");
  const [streamStep, setStreamStep] = useState(0);
  const [pulseActive, setPulseActive] = useState(true);

  const currentAgent = AGENT_PRESETS.find((a) => a.id === activeAgent) || AGENT_PRESETS[0];
  const currentModel = FEATURED_MODELS.find((m) => m.id === activeModelId) || FEATURED_MODELS[0];

  // Simulated streaming typewriter effect
  useEffect(() => {
    setStreamStep(0);
    const interval = setInterval(() => {
      setStreamStep((prev) => {
        if (prev < currentModel.sampleStream.length) {
          return prev + 1;
        }
        return prev;
      });
    }, 900);

    return () => clearInterval(interval);
  }, [activeAgent, activeModelId]);

  return (
    <div className="hero-bridge-console" role="region" aria-label="Interactive zed2cli Bridge Visualizer">
      {/* Console Top Window Header */}
      <div className="bridge-console-header">
        <div className="bridge-window-dots">
          <span className="dot dot-close" />
          <span className="dot dot-min" />
          <span className="dot dot-expand" />
        </div>
        <div className="bridge-console-title">
          <span className="live-indicator">
            <span className="live-dot" />
            LIVE BRIDGE
          </span>
          <span className="bridge-header-tag font-mono">cloud.zed.dev/completions</span>
        </div>
        <div className="bridge-mode-chip">
          <span className="font-mono">{currentAgent.mode}</span>
        </div>
      </div>

      {/* Agent Selector Bar */}
      <div className="bridge-agent-tabs">
        <span className="bridge-tabs-label font-mono">AGENT:</span>
        {AGENT_PRESETS.map((agent) => (
          <button
            key={agent.id}
            type="button"
            onClick={() => {
              setActiveAgent(agent.id);
              setPulseActive(true);
            }}
            className={`bridge-agent-tab ${activeAgent === agent.id ? "active" : ""}`}
          >
            <span>{agent.name}</span>
            <span className="agent-pill">{agent.badge}</span>
          </button>
        ))}
      </div>

      {/* Visual Conduit Network */}
      <div className="bridge-conduit-body">
        {/* Node 1: Terminal Agent Source */}
        <div className="conduit-node client-node">
          <div className="node-head">
            <span className="node-badge font-mono">01 CLIENT</span>
            <span className="node-protocol font-mono">{currentAgent.transport}</span>
          </div>
          <div className="node-cmd font-mono">
            <span className="prompt-sym">&gt;</span> {currentAgent.command}
          </div>
          <div className="node-meta font-mono text-xs">{currentAgent.hookDetail}</div>
        </div>

        {/* Animated Connector 1 -> 2 */}
        <div className="conduit-flow-cable">
          <svg className="cable-svg" viewBox="0 0 340 28" fill="none" preserveAspectRatio="none">
            <line
              x1="0"
              y1="14"
              x2="340"
              y2="14"
              stroke="var(--rule)"
              strokeWidth="2"
              strokeDasharray="6 4"
              className={pulseActive ? "flow-dash-anim" : ""}
            />
          </svg>
          <div className="cable-tag font-mono">
            <i className="fas fa-arrows-split-up-and-left cable-icon" />
            <span>OpenAI Spec ⇄ Zed Protocol</span>
          </div>
        </div>

        {/* Node 2: zed2cli Translation Core */}
        <div className="conduit-node bridge-core-node">
          <div className="bridge-core-badge-row">
            <span className="bridge-brand font-mono">zed2cli engine</span>
            <span className="status-pill font-mono">
              <i className="fas fa-shield-halved" /> Keyring Auth ~50m
            </span>
          </div>
          <div className="bridge-feature-chips font-mono">
            <span className="chip">
              <i className="fas fa-key" /> JWT Auto-Mint
            </span>
            <span className="chip">
              <i className="fas fa-stream" /> SSE ⟷ NDJSON
            </span>
            <span className="chip">
              <i className="fas fa-feather" /> 0 Runtime Deps
            </span>
          </div>
        </div>

        {/* Animated Connector 2 -> 3 */}
        <div className="conduit-flow-cable">
          <svg className="cable-svg" viewBox="0 0 340 28" fill="none" preserveAspectRatio="none">
            <line
              x1="0"
              y1="14"
              x2="340"
              y2="14"
              stroke="var(--rule)"
              strokeWidth="2"
              strokeDasharray="6 4"
              className={pulseActive ? "flow-dash-anim" : ""}
            />
          </svg>
          <div className="cable-tag font-mono">
            <i className="fas fa-satellite-dish cable-icon" />
            <span>Cloudflare Edge (cf-ray verified)</span>
          </div>
        </div>

        {/* Node 3: Zed Cloud & Model Selector */}
        <div className="conduit-node cloud-node">
          <div className="node-head">
            <span className="node-badge font-mono">03 ZED CLOUD</span>
            <span className="node-status font-mono">HTTP 200 STREAM</span>
          </div>

          <div className="model-selector-row">
            {FEATURED_MODELS.map((model) => (
              <button
                key={model.id}
                type="button"
                onClick={() => setActiveModelId(model.id)}
                className={`model-chip ${activeModelId === model.id ? "active" : ""}`}
                title={`Switch model to ${model.label}`}
              >
                <span className="model-provider">{model.provider}</span>
                <span className="model-name font-mono">{model.label}</span>
              </button>
            ))}
          </div>

          {/* Live Wire Stream Output */}
          <div className="bridge-wire-monitor font-mono">
            <div className="wire-monitor-bar">
              <span>WIRE INSPECTOR ({currentModel.label})</span>
              <span className="wire-ctx">{currentModel.context}</span>
            </div>
            <div className="wire-monitor-lines">
              {currentModel.sampleStream.slice(0, Math.max(1, streamStep)).map((line, i) => (
                <div key={i} className="wire-line">
                  <span className="wire-num">{String(i + 1).padStart(2, "0")}</span>
                  <span className={line.includes("stream_ended") ? "wire-ok" : "wire-chunk"}>{line}</span>
                </div>
              ))}
              {streamStep < currentModel.sampleStream.length && (
                <div className="wire-cursor">
                  <span className="wire-blink">█</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Integrated Telemetry Counter Row */}
      <div className="bridge-telemetry-row">
        {telemetry.stats.map((stat, idx) => (
          <div key={idx} className="bridge-telemetry-card">
            <span className="bridge-telemetry-number font-mono">{stat.number}</span>
            <span className="bridge-telemetry-label font-mono">{stat.label}</span>
          </div>
        ))}
      </div>

      <div className="bridge-footer-caption font-mono">
        <span>{telemetry.updatedText}</span>
        {links.github && (
          <div className="bridge-inline-support" role="group" aria-label="Support repository">
            <a
              href={links.github}
              target="_blank"
              rel="noopener noreferrer"
              className="hero-support-icon"
              title="Star on GitHub"
            >
              <i className="far fa-star" />
            </a>
            {links.sponsor && (
              <a
                href={links.sponsor}
                target="_blank"
                rel="noopener noreferrer"
                className="hero-support-icon"
                title="Sponsor"
              >
                <i className="fas fa-heart" />
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
