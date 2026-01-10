import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
        port: "",
        pathname: "/**", // 모든 하위 경로 허용
      },
      {
        protocol: "https",
        hostname: "picsum.photos",
        port: "",
        pathname: "/**", // 모든 하위 경로 허용
      },
    ],
  },
};


/**{
        protocol: "https",
        hostname: "res.cloudinary.com", // Cloudinary만 허용
        pathname: "/**",
      }
 */
export default nextConfig;
