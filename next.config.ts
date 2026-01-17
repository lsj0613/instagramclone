import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",

    // 모든 https 프로토콜의 모든 호스트네임을 허용합니다.
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
  allowedDevOrigins: [
    "3000-firebase-instagramclone-1766640599126.cluster-va5f6x3wzzh4stde63ddr3qgge.cloudworkstations.dev",
  ],
};

export default nextConfig;
