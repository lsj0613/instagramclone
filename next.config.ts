import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // 1. SVG 허용 설정
    dangerouslyAllowSVG: true,

    // 2. 보안을 위한 CSP 설정 (SVG 내부 스크립트 실행 방지)
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",

    remotePatterns: [
      {
        protocol: "https",
        hostname: "avatars.githubusercontent.com",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "picsum.photos",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "loremflickr.com",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "api.dicebear.com", // DiceBear 도메인
        port: "",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
