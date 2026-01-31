import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  // Turbopack is enabled by default in Next.js 16
  turbopack: {},
};

export default nextConfig;
