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
};

export default nextConfig;
