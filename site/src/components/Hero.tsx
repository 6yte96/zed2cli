"use client";

import { useState } from "react";
import { PROJECT_CONFIG } from "@/config";

export function Hero() {
  const { hero, install, telemetry, links, publish } = PROJECT_CONFIG;
  const [selectedManager, setSelectedManager] = useState(
    install.defaultManager || "npm"
  );
  const [copied, setCopied] = useState(false);

  const currentCommand =
    install.managers[selectedManager] || `npm install ${PROJECT_CONFIG.brand.name}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(currentCommand);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  return (
    <section className="hero">
      <div className="hero-content">
        <div className="issue-line">
          <span className="issue-badge">{hero.issueBadge}</span>
        </div>

        <h1 className="hero-title">
          <span>{hero.titleLines.before}</span>
          <br />
          <span className="gradient-text">{hero.titleLines.highlight}</span>
          <br />
          <span>{hero.titleLines.after}</span>
        </h1>

        <p className="hero-description">{hero.description}</p>

        {/* Installation Bar with Package Manager Tabs */}
        <div style={{ marginTop: "2rem" }}>
          <div className="install-tabs">
            {Object.keys(install.managers).map((manager) => (
              <button
                key={manager}
                type="button"
                onClick={() => setSelectedManager(manager)}
                className={`install-tab-btn ${
                  selectedManager === manager ? "active" : ""
                }`}
              >
                {manager}
              </button>
            ))}
          </div>

          <div className="install-box">
            <div className="install-box-code">
              <span className="prompt">$</span>
              <span>{currentCommand}</span>
            </div>
            <button
              onClick={handleCopy}
              className={`copy-btn ${copied ? "copied" : ""}`}
              title="Copy installation command"
            >
              <i
                className={`fas ${
                  copied ? "fa-check" : "fa-copy"
                }`}
              ></i>
              <span>{copied ? "Copied" : "Copy"}</span>
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "0.75rem",
            marginTop: "1.75rem",
          }}
        >
          <a href={hero.primaryCta.href} className="btn-broadsheet-primary">
            <span>{hero.primaryCta.text}</span>
            <i
              className="fas fa-arrow-right"
              style={{ marginLeft: "0.5rem", fontSize: "10px" }}
            ></i>
          </a>
          <a
            href={hero.secondaryCta.href}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-broadsheet-outline"
          >
            <i
              className="fab fa-github"
              style={{ marginRight: "0.45rem", fontSize: "12px" }}
            ></i>
            <span>{hero.secondaryCta.text}</span>
          </a>
        </div>

        {/* Published package and live page */}
        <div
          className="font-mono text-xs text-muted-foreground"
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            gap: "0.5rem 1rem",
            marginTop: "1.5rem",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
          }}
        >
          <a
            href={publish.npmUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "inherit", textDecoration: "underline" }}
          >
            npm: zed2cli@{publish.version}
          </a>
          <span>{publish.license}</span>
          <span>node {publish.node}</span>
          <a
            href={publish.pagesUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "inherit", textDecoration: "underline" }}
          >
            live page
          </a>
        </div>
      </div>

      <div className="hero-visual">
        <div className="press-run-card">
          <div className="press-run-label">{telemetry.label}</div>
          {telemetry.stats.map((stat, idx) => (
            <div key={idx} className="press-stat">
              <span className="press-stat-number">{stat.number}</span>
              <span className="press-stat-label">{stat.label}</span>
            </div>
          ))}
        </div>
        <div className="press-run-update">{telemetry.updatedText}</div>

        {/* Quiet support icons: borderless until hover, same muted
            register as the telemetry text. The labeled support card
            lives at the bottom of the page. */}
        {links.github && (
          <div className="hero-quiet-support" role="group" aria-label="Support this project">
            <a
              href={links.github}
              target="_blank"
              rel="noopener noreferrer"
              className="hero-support-icon"
              title="Star on GitHub"
              aria-label="Star on GitHub"
            >
              <i className="far fa-star"></i>
            </a>
            {links.sponsor && (
              <a
                href={links.sponsor}
                target="_blank"
                rel="noopener noreferrer"
                className="hero-support-icon"
                title="Sponsor"
                aria-label="Sponsor"
              >
                <i className="fas fa-heart"></i>
              </a>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
