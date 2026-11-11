import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "images", hostname: "images.unsplash.com" }
    ]
  }
};

export default nextConfig;
