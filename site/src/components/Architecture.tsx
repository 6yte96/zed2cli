import { PROJECT_CONFIG } from "@/config";
import { Diagram } from "./Diagram";

export function Architecture() {
  const { architecture } = PROJECT_CONFIG;

  return (
    <section id="architecture" className="projects-section" style={{ paddingTop: "1rem" }}>
      <div className="section-header">
        <div className="section-header-left">
          <h2 className="section-title">{architecture.title}</h2>
          <p className="section-description">{architecture.subtitle}</p>
        </div>
      </div>

      <Diagram />

      <div
        className="container"
        style={{ padding: 0, marginTop: "1.75rem" }}
      >
        <div className="editorial-chronicle-list">
          {architecture.layers.map((layer, idx) => (
            <div key={idx} className="editorial-chronicle-card">
              <div className="chronicle-header">
                <div className="chronicle-title-row">
                  <span className="postcard-tag boxed tilt-up chronicle-layer-tag">
                    {layer.tag}
                  </span>
                  <h3 className="chronicle-role">{layer.name}</h3>
                </div>
              </div>

              <div className="chronicle-body">
                <p className="chronicle-text">{layer.role}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
