import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@project-ta/shared"],
  reactStrictMode: true,
  eslint: { ignoreDuringBuilds: true },
};

export default nextConfig;
