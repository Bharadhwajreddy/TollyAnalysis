import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  // Private beta: keep out of search engines.
  { key: "X-Robots-Tag", value: "noindex, nofollow" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // One headline score: the Star Score and Rankings pages live on as views of the Index explorer; Trends is part of Years.
  // Not permanent while the site is in beta.
  async redirects() {
    return [
      { source: "/star-score", destination: "/tolly-index?view=boxoffice", permanent: false },
      { source: "/rankings", destination: "/tolly-index?view=table", permanent: false },
      { source: "/trends", destination: "/releases", permanent: false },
    ];
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
