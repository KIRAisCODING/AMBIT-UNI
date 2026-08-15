import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";
const rawFrontendUrl = process.env.FRONTEND_URL || process.env.APP_URL || (isProd ? "" : "http://localhost:3000");
const frontendUrl = rawFrontendUrl.replace(/\/$/, "");

const nextConfig: NextConfig = {
  async redirects() {
    if (!frontendUrl) {
      return [];
    }
    return [
      {
        source: '/:path((?!api|_next|favicon.ico).*)',
        destination: `${frontendUrl}/:path`,
        permanent: false,
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), bluetooth=()",
          },
          ...(isProd
            ? [
                {
                  key: "Strict-Transport-Security",
                  value: "max-age=31536000",
                },
              ]
            : []),
        ],
      },
    ];
  },
};

export default nextConfig;
