import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Enable standalone output for Docker deployments
  output: 'standalone',
  
  // For WebSocket connections
  webpack: (config) => {
    config.resolve.fallback = { ...config.resolve.fallback, net: false };
    return config;
  },
  
  // Proxy WebSocket connections to Zero server
  async rewrites() {
    return [
      {
        source: '/zero/:path*',
        destination: 'http://localhost:4848/:path*',
      },
    ];
  },
};

export default nextConfig;
