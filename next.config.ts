import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [{ source: "/progress", destination: "/", permanent: true }];
  },
};

export default nextConfig;
