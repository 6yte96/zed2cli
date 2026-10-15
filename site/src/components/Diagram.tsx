/**
 * Architecture flow diagram, drawn inline as SVG so it inherits the paper
 * and ink theme colors and stays crisp at any zoom.
 *
 *   clients (in process or HTTP)  ->  zed2cli translation layer  ->  cloud.zed.dev
 *
 * The token resolver sits beside the layer because it feeds the outbound
 * request its Bearer JWT.
 */
export function Diagram() {
  const ink = "var(--ink)";
  const sub = "var(--muted-foreground)";
  const face = "var(--surface-soft)";

  const clientBox = (x: number, title: string, detail: string) => (
    <g key={title}>
      <rect x={x} y={14} width={250} height={78} fill={face} stroke={ink} strokeWidth={1.5} />
      <text x={x + 125} y={48} textAnchor="middle" fontSize={15} fontWeight={700} fill={ink}>
        {title}
      </text>
      <text x={x + 125} y={70} textAnchor="middle" fontSize={12} fill={sub}>
        {detail}
      </text>
    </g>
  );

  return (
    <div
      style={{
        marginTop: "1.75rem",
        border: "1px solid var(--rule)",
        background: "var(--surface-soft)",
        padding: "1.25rem 1rem 1rem",
        overflowX: "auto",
      }}
    >
      <svg
        viewBox="0 0 920 580"
        role="img"
        aria-label="zed2cli sits between CLI clients and cloud.zed.dev, translating requests and responses"
        style={{
          width: "100%",
          minWidth: "720px",
          height: "auto",
          display: "block",
          fontFamily: "var(--font-mono)",
        }}
      >
        <defs>
          <marker
            id="zarr"
            viewBox="0 0 10 10"
            refX="10"
            refY="5"
            markerWidth="7"
            markerHeight="7"
            orient="auto"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill={ink} />
          </marker>
        </defs>

        {/* Clients */}
        {clientBox(24, "OpenCode", "plugin, in process")}
        {clientBox(335, "pi", "extension, HTTP")}
        {clientBox(646, "Any OpenAI client", "Hermes, scripts, HTTP")}

        {/* Client connectors down to the shared bus */}
        {[149, 460, 771].map((cx) => (
          <line key={cx} x1={cx} y1={92} x2={cx} y2={150} stroke={ink} strokeWidth={1.5} />
        ))}
        <line x1={149} y1={150} x2={771} y2={150} stroke={ink} strokeWidth={1.5} />
        <line
          x1={460}
          y1={150}
          x2={460}
          y2={194}
          stroke={ink}
          strokeWidth={1.5}
          markerEnd="url(#zarr)"
        />

        {/* Translation layer */}
        <rect x={210} y={196} width={500} height={170} fill={face} stroke={ink} strokeWidth={2} />
        <text x={230} y={228} fontSize={17} fontWeight={700} fill={ink}>
          zed2cli
        </text>
        <text x={300} y={228} fontSize={12} fill={sub}>
          translation layer
        </text>

        <text x={230} y={262} fontSize={13} fill={ink}>
          <tspan fontWeight={700}>cli.mjs</tspan>
          <tspan fill={sub}>  dispatcher</tspan>
        </text>
        <text x={230} y={288} fontSize={13} fill={ink}>
          <tspan fontWeight={700}>src/index.mjs</tspan>
          <tspan fill={sub}>  OpenCode 2</tspan>
        </text>
        <text x={230} y={314} fontSize={13} fill={ink}>
          <tspan fontWeight={700}>src/index.v1.mjs</tspan>
          <tspan fill={sub}>  OpenCode 1</tspan>
        </text>

        <text x={470} y={262} fontSize={13} fill={ink}>
          <tspan fontWeight={700}>src/proxy.mjs</tspan>
          <tspan fill={sub}>  OpenAI bridge</tspan>
        </text>
        <text x={470} y={288} fontSize={13} fill={ink}>
          <tspan fontWeight={700}>src/models.mjs</tspan>
          <tspan fill={sub}>  catalog</tspan>
        </text>
        <text x={470} y={314} fontSize={13} fill={ink}>
          <tspan fontWeight={700}>src/pi/zed-ai.mjs</tspan>
          <tspan fill={sub}>  pi</tspan>
        </text>

        {/* Token resolver feeding the layer */}
        <rect x={730} y={240} width={170} height={92} fill={face} stroke={ink} strokeWidth={1.5} />
        <text x={815} y={266} textAnchor="middle" fontSize={13} fontWeight={700} fill={ink}>
          token resolver
        </text>
        <text x={815} y={288} textAnchor="middle" fontSize={11} fill={sub}>
          scripts/zed-token.sh
        </text>
        <text x={815} y={308} textAnchor="middle" fontSize={11} fill={sub}>
          keyring or saved file
        </text>
        <line
          x1={730}
          y1={286}
          x2={714}
          y2={286}
          stroke={ink}
          strokeWidth={1.5}
          markerEnd="url(#zarr)"
        />

        {/* Out to cloud */}
        <line
          x1={460}
          y1={366}
          x2={460}
          y2={438}
          stroke={ink}
          strokeWidth={1.5}
          markerEnd="url(#zarr)"
        />
        <text x={478} y={408} fontSize={12} fill={sub}>
          provider_request out, streamed events back
        </text>

        <rect x={270} y={440} width={380} height={104} fill={face} stroke={ink} strokeWidth={2} />
        <text x={460} y={476} textAnchor="middle" fontSize={17} fontWeight={700} fill={ink}>
          cloud.zed.dev
        </text>
        <text x={460} y={502} textAnchor="middle" fontSize={12} fill={sub}>
          POST /completions
        </text>
        <text x={460} y={522} textAnchor="middle" fontSize={12} fill={sub}>
          Bearer JWT from your Zed account
        </text>
      </svg>

      <p
        style={{
          marginTop: "0.85rem",
          fontSize: "12px",
          color: "var(--muted-foreground)",
          fontFamily: "var(--font-mono)",
        }}
      >
        OpenCode talks to the layer in process. pi, Hermes, and other clients
        talk to it over HTTP on 127.0.0.1:8787. Both leave through the same
        translation code.
      </p>
    </div>
  );
}
