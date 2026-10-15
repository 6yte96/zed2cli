import type { NextConfig } from "next";

/**
 * Static export for GitHub Pages (project pages).
 * Set NEXT_PUBLIC_BASE_PATH="" for a custom domain root.
 */
const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: "export",
  basePath: process.env.NEXT_PUBLIC_BASE_PATH ?? "/zed2cli",
  images: {
    unoptimized: true,
  },
  trailingSlash: true,
};

export default nextConfig;
