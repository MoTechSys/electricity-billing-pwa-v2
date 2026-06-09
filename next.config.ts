import type { NextConfig } from "next";

// Local Caddy preview serves under /billing; Vercel serves at root.
// Build locally with: NEXT_PUBLIC_BASE_PATH=/billing npm run build
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

const nextConfig: NextConfig = {
  // Standalone PWA. No backend. DB lives on-device (IndexedDB via Dexie).
  ...(basePath ? { basePath, assetPrefix: basePath } : {}),
};

export default nextConfig;
