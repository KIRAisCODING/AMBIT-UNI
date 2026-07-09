import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: '/:path((?!api|_next|favicon.ico).*)',
        destination: 'http://localhost:3000/:path',
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
