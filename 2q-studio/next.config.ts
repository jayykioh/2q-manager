import type { NextConfig } from "next";

const R2_PUBLIC_HOSTNAME = process.env.NEXT_PUBLIC_R2_PUBLIC_URL
  ? new URL(process.env.NEXT_PUBLIC_R2_PUBLIC_URL).hostname
  : "pub-61fd82e9b2fe40b6b1ded479b6e1ee6a.r2.dev";

const nextConfig: NextConfig = {
  // ── Image optimisation ──────────────────────────────────────────────────────
  images: {
    // Allow Next.js <Image> to serve & optimise images from Cloudflare R2
    remotePatterns: [
      {
        protocol: "https",
        hostname: R2_PUBLIC_HOSTNAME,
        pathname: "/**",
      },
    ],
    // Auto-serve AVIF → WebP → JPEG depending on browser support
    formats: ["image/avif", "image/webp"],
    // Cache optimised images for 7 days on Vercel edge
    minimumCacheTTL: 60 * 60 * 24 * 7,
    // Allowed widths (covers thumb → HD)
    deviceSizes: [320, 480, 640, 750, 828, 1080, 1200],
    imageSizes: [16, 32, 48, 64, 96, 128, 256],
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
