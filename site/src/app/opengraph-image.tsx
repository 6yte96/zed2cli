import { ImageResponse } from "next/og";
import { PROJECT_CONFIG } from "@/config";

export const dynamic = "force-static";
export const alt = PROJECT_CONFIG.meta.title;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const { brand, publish, hero } = PROJECT_CONFIG;

/**
 * Build time Open Graph card, drawn in the paper and ink palette so shared
 * links look like the page itself.
 */
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#F2F8FC",
          color: "#000000",
          border: "14px solid #000000",
          padding: "56px 64px",
          fontFamily: "monospace",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderBottom: "3px solid #000000",
            paddingBottom: "20px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", fontSize: 40, fontWeight: 700 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 56,
                height: 56,
                border: "4px solid #000000",
                marginRight: 20,
                fontSize: 30,
              }}
            >
              z2
            </div>
            {brand.name}
          </div>
          <div style={{ display: "flex", fontSize: 30 }}>{`v${publish.version}`}</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", fontSize: 42, letterSpacing: -1 }}>
            {hero.titleLines.before}
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 84,
              fontWeight: 700,
              letterSpacing: -2,
              lineHeight: 1.05,
            }}
          >
            {hero.titleLines.highlight}
          </div>
          <div style={{ display: "flex", fontSize: 42, letterSpacing: -1 }}>
            {hero.titleLines.after}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: 28,
            borderTop: "3px solid #000000",
            paddingTop: "20px",
          }}
        >
          <div style={{ display: "flex" }}>cloud.zed.dev</div>
          <div style={{ display: "flex" }}>OpenCode, pi, Hermes</div>
          <div style={{ display: "flex" }}>{publish.license}</div>
        </div>
      </div>
    ),
    size
  );
}
