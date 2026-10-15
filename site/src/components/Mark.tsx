/**
 * Inline brand mark for zed2cli: a boxed monogram drawn with the current
 * text color, so it follows the paper and ink theme in both modes.
 */
export function Mark({ size = 26 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      role="img"
      aria-label="zed2cli"
      style={{ verticalAlign: "middle", marginRight: "0.5rem" }}
    >
      <rect
        x="1.5"
        y="1.5"
        width="29"
        height="29"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      />
      <text
        x="16"
        y="22"
        textAnchor="middle"
        fontSize="15"
        fontWeight="700"
        fill="currentColor"
        style={{ fontFamily: "var(--font-mono)" }}
      >
        z2
      </text>
    </svg>
  );
}
