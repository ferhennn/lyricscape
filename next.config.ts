import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Our own procedural SVGs (demo artwork) are served through next/image.
    dangerouslyAllowSVG: true,
    contentDispositionType: "attachment",
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    remotePatterns: [
      { protocol: "https", hostname: "*.mzstatic.com" },
      { protocol: "https", hostname: "is1-ssl.mzstatic.com" },
      { protocol: "https", hostname: "a1.mzstatic.com" },
      { protocol: "https", hostname: "*.jamendo.com" },
      { protocol: "https", hostname: "usercontent.jamendo.com" },
      { protocol: "https", hostname: "imgjam.jamendo.com" },
    ],
  },
  async headers() {
    return [
      {
        // MusicKit is loaded from Apple's CDN at runtime.
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
};

export default nextConfig;
