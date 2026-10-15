import { PROJECT_CONFIG } from "@/config";

export function Models() {
  const { models } = PROJECT_CONFIG;

  return (
    <section id="models" className="projects-section" style={{ paddingTop: "1rem" }}>
      <div className="section-header">
        <div className="section-header-left">
          <h2 className="section-title">{models.title}</h2>
          <p className="section-description">{models.subtitle}</p>
        </div>
      </div>

      <div className="benchmark-table-wrapper">
        <table className="benchmark-table">
          <thead>
            <tr>
              {models.headers.map((header, idx) => (
                <th key={idx}>{header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {models.rows.map((row, idx) => (
              <tr key={idx} className={row.highlight ? "highlight-row" : ""}>
                <td>
                  <strong>{row.name}</strong>
                  {row.isTarget && (
                    <span className="benchmark-badge-best">DEFAULT</span>
                  )}
                </td>
                {row.metrics.map((metric, mIdx) => (
                  <td key={mIdx}>{metric}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "1rem",
          marginTop: "0.75rem",
        }}
        className="font-mono text-xs text-muted-foreground"
      >
        <span>{models.note}</span>
        <span className="telemetry-pill">
          <span
            aria-hidden="true"
            style={{
              display: "inline-block",
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: "var(--ink)",
              marginRight: "0.4rem",
              verticalAlign: "middle",
            }}
          ></span>
          <span>{models.pill}</span>
        </span>
      </div>
    </section>
  );
}
