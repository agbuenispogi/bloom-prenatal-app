import type { NextConfig } from "next";

// cacheComponents stays off: every screen shows live, per-household data that must never be stale.
const nextConfig: NextConfig = {
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
