import { PROJECT_CONFIG } from "@/config";

export function Footer() {
  const { brand, links, meta, nav, support, publish } = PROJECT_CONFIG;
  const currentYear = new Date().getFullYear();

  return (
    <footer className="footer">
      <div className="footer-content">
        <div className="footer-section">
          <h3>
            {brand.name}
            <span>{brand.domainSuffix}</span>
          </h3>
          <p>{meta.description}</p>
        </div>

        <div className="footer-section">
          <h4>Navigation</h4>
          <div className="footer-links">
            {nav.map((item) => (
              <a key={item.id} href={`#${item.id}`} className="footer-link">
                {item.label}
              </a>
            ))}
          </div>
        </div>

        <div className="footer-section">
          <h4>Links</h4>
          <div className="social-links">
            <a
              href={links.github}
              target="_blank"
              rel="noopener noreferrer"
              className="social-link"
              title="GitHub Repository"
            >
              <i className="fab fa-github"></i>
            </a>
            {links.npm && (
              <a
                href={links.npm}
                target="_blank"
                rel="noopener noreferrer"
                className="social-link"
                title="npm Package"
              >
                <i className="fab fa-npm"></i>
              </a>
            )}
            {links.pages && (
              <a
                href={links.pages}
                target="_blank"
                rel="noopener noreferrer"
                className="social-link"
                title="Live Page"
              >
                <i className="fas fa-globe"></i>
              </a>
            )}
            {links.sponsor && (
              <a
                href={links.sponsor}
                target="_blank"
                rel="noopener noreferrer"
                className="social-link"
                title="Sponsor"
              >
                <i className="fas fa-heart"></i>
              </a>
            )}
          </div>
        </div>
      </div>

      <div className="footer-bottom">
        <p>
          &copy; {currentYear} {brand.name} Contributors.
        </p>
        <p className="footer-version">
          <a
            href={`${links.github}/blob/main/LICENSE`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "inherit", textDecoration: "underline" }}
          >
            {support.license} License
          </a>
          {" // "}
          <a
            href={publish.npmUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "inherit", textDecoration: "underline" }}
          >
            npm zed2cli@{publish.version}
          </a>
          {" // "}
          {meta.version} // @{brand.handle}
        </p>
        <p
          className="footer-version"
          style={{ marginTop: "0.5rem", opacity: 0.75, textAlign: "left" }}
        >
          {publish.note}
        </p>
      </div>
    </footer>
  );
}
