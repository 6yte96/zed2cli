"use client";

import { useState, useMemo } from "react";
import { PROJECT_CONFIG } from "@/config";

export function FeatureBento() {
  const { features, links } = PROJECT_CONFIG;
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  const categories = useMemo(() => {
    const set = new Set(features.map((f) => f.category));
    return ["all", ...Array.from(set)];
  }, [features]);

  const filteredFeatures = useMemo(() => {
    return features.filter((feat) => {
      const matchCat =
        selectedCategory === "all" || feat.category === selectedCategory;
      const query = searchQuery.toLowerCase().trim();
      if (!query) return matchCat;

      const text = `${feat.title} ${feat.description} ${feat.tech} ${feat.category} ${feat.meta}`.toLowerCase();
      return matchCat && text.includes(query);
    });
  }, [features, selectedCategory, searchQuery]);

  return (
    <section id={PROJECT_CONFIG.nav.find((n) => n.id === "features") ? "features" : undefined} className="projects-section">
      <div className="section-header">
        <div className="section-header-left">
          <h2 className="section-title">Capabilities</h2>
          <p className="section-description">
            Everything zed2cli wires up between <code>install</code> and a
            working agent. Search by keyword, filter by scope.
          </p>
        </div>
      </div>

      {/* Editorial Filter Bar */}
      <div className="editorial-filter-bar">
        <div className="filter-bar-left">
          <span className="label-mono filter-bar-label">grep</span>
          <span className="filter-prompt font-mono">$</span>
          <div className="editorial-search-form">
            <input
              type="text"
              placeholder="search capability, tech, protocol..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="editorial-search-input"
            />
          </div>
        </div>

        <div className="filter-bar-right">
          <span className="label-mono filter-bar-label">scope</span>
          <div className="editorial-sort-buttons">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`editorial-sort-btn ${
                  selectedCategory === cat ? "active" : ""
                }`}
              >
                {cat.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Bento Grid */}
      <div className="projects-grid">
        {filteredFeatures.map((feat, index) => (
          <article
            key={feat.id}
            id={feat.id}
            className={`project-card postcard-card ${feat.bentoClass}`}
            style={{ animationDelay: `${(index % 6) * 0.1}s` }}
          >
            <div className="postcard-topline">
              <div className="postcard-tags">
                <span className={`postcard-tag boxed ${feat.tilt}`}>
                  {feat.category}
                </span>
                <span className="postcard-tag plain">{feat.tech}</span>
              </div>
            </div>

            <div className="card-content postcard-content">
              <h3 className="card-title postcard-title">{feat.title}</h3>
              <p className="card-excerpt postcard-excerpt">{feat.description}</p>
            </div>

            <div className="card-footer postcard-footer">
              <div className="postcard-footer-copy">
                <a
                  href={feat.repoHref || links.github}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="postcard-repo-link"
                >
                  <span aria-hidden="true">-&gt;</span>
                  <span>{feat.repoLinkText || feat.id}</span>
                </a>

                <div className="postcard-meta-line">
                  <span>{feat.meta}</span>
                </div>
              </div>

              <div className="postcard-actions">
                <div
                  className="postcard-impressions-stamp"
                  title={`${feat.stamp.label}: ${feat.stamp.value}`}
                >
                  <span>{feat.stamp.label}</span>
                  <strong>{feat.stamp.value}</strong>
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
