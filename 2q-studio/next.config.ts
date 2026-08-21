import type { NextConfig } from "next";

const R2_PUBLIC_HOSTNAME = process.env.NEXT_PUBLIC_R2_PUBLIC_URL
  ? new URL(process.env.NEXT_PUBLIC_R2_PUBLIC_URL).hostname
  : "pub-61fd82e9b2fe40b6b1ded479b6e1ee6a.r2.dev";

const nextConfig: NextConfig = {
  // ── Image optimisation ──────────────────────────────────────────────────────
  // unoptimized: true → bypass Vercel Image Optimization entirely.
  // Images are already pre-processed at upload time (thumb + full variants)
  // and served directly from Cloudflare R2 CDN. This prevents burning through
  // the free-tier 5,000 Transformations quota.
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: "https",
        hostname: R2_PUBLIC_HOSTNAME,
        pathname: "/**",
      },
    ],
  },

  // ── HTTP Headers ────────────────────────────────────────────────────────────
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
          { key: "Permissions-Policy", value: "camera=(), geolocation=(), microphone=()" },
        ],
      },
      // Long-lived cache for static assets (hashed filenames by Next.js)
      {
        source: "/_next/static/(.*)",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
    ];
  },
};

export default nextConfig;
