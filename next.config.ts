import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  basePath: "/billing",
  assetPrefix: "/billing",
  // Ensure dynamic routes are not overly cached
  experimental: {
    // Disable static generation for auth-dependent pages
  },
  // Allow all hosts for sandbox environment
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Cache-Control', value: 'no-store, no-cache, must-revalidate' },
        ],
      },
    ];
  },
};

export default nextConfig;
