import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  // NOTE: Turbopack is intentionally disabled because @xenova/transformers
  // uses an ESM/CJS hybrid pattern that Turbopack cannot resolve correctly,
  // causing dynamic imports to resolve as null/undefined at runtime.
  webpack: (config, { isServer }) => {
    // Prevent @xenova/transformers from being bundled on the server side
    if (isServer) {
      config.externals = [
        ...(Array.isArray(config.externals) ? config.externals : []),
        '@xenova/transformers',
      ];
    }

    // Required for onnxruntime-web used by @xenova/transformers
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      path: false,
      crypto: false,
    };

    return config;
  },
};

export default nextConfig;
