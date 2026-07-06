import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typedRoutes: false,
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
