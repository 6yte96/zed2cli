"use client";

import { useState } from "react";
import { PROJECT_CONFIG } from "@/config";

/**
 * Support card: the main ask at the bottom of the page.
 * Full-row postcard anatomy with horizontal rules and hover crop ticks.
 * The share button uses the Web Share API with a clipboard fallback.
 */
export function Support() {
  const { links, brand, support } = PROJECT_CONFIG;
  const [shared, setShared] = useState(false);

  const handleShare = async () => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    const title = support.shareTitle;
    try {
      if (navigator.share) {
        await navigator.share({ title, url });
        setShared(true);
        setTimeout(() => setShared(false), 2000);
      } else {
        await navigator.clipboard.writeText(`${title} ${url}`);
        setShared(true);
        setTimeout(() => setShared(false), 2000);
      }
    } catch {
      // user dismissed the share sheet; nothing to do
    }
  };

  return (
    <section id="support" className="projects-section">
      <div className="container" style={{ padding: 0 }}>
        <article className="project-card postcard-card support-card">
          <div className="postcard-topline">
            <div className="postcard-tags">
              <span className="postcard-tag boxed tilt-up">SUPPORT</span>
            </div>
          </div>

          <div className="card-content postcard-content">
            <h3 className="card-title postcard-title support-title">
              {support.heading}
            </h3>
            <p className="card-excerpt postcard-excerpt support-excerpt">
              {support.text}
            </p>
          </div>

          <div className="card-footer postcard-footer support-footer">
            <div className="postcard-footer-copy">
              <a
                href={links.github}
                target="_blank"
                rel="noopener noreferrer"
                className="postcard-repo-link"
              >
                <span aria-hidden="true">-&gt;</span>
                <span>
                  {brand.handle}/{brand.name}
                </span>
              </a>

              <div className="postcard-meta-line">
                <span>@{brand.handle}</span>
                <span>,</span>
                <span>{support.license}</span>
                <span>,</span>
                <time dateTime={support.year}>{support.year}</time>
              </div>
            </div>

            <div className="postcard-actions">
              <div
                className="postcard-impressions-stamp"
                title={`License: ${support.license}`}
              >
                <span>LICENSE</span>
                <strong>{support.license}</strong>
              </div>

              <div className="support-actions">
                <a
                  href={links.github}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="support-btn primary"
                >
                  <i className="far fa-star"></i>
                  <span>{support.starLabel}</span>
                </a>

                <button
                  type="button"
                  onClick={handleShare}
                  className="support-btn"
                  aria-label="Share this project"
                >
                  <i className="fas fa-share-nodes"></i>
                  <span>{shared ? "Shared" : "Share"}</span>
                </button>

                {links.sponsor && (
                  <a
                    href={links.sponsor}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="support-btn"
                  >
                    <i className="fas fa-heart"></i>
                    <span>{support.sponsorLabel}</span>
                  </a>
                )}
              </div>
            </div>
          </div>
        </article>
      </div>
    </section>
  );
}
