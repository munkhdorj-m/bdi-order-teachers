import type { NextConfig } from "next";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseHostname = supabaseUrl ? new URL(supabaseUrl).hostname : undefined;

const nextConfig: NextConfig = {
  // The dev terminal would otherwise print every server action's arguments,
  // PINs included.
  logging: { serverFunctions: false },
  // The dev-only "N" button sat on top of the phone menu's first tab.
  // Build and runtime errors still show.
  devIndicators: false,
  images: {
    // WebP only: AVIF makes text on product packaging blocky.
    formats: ["image/webp"],
    // Product photos are public files in BDI's Supabase Storage.
    remotePatterns: supabaseHostname
      ? [{ protocol: "https", hostname: supabaseHostname, pathname: "/storage/v1/object/public/**" }]
      : undefined,
  },
  async headers() {
    return [
      {
        // Browsers keep a service worker until /sw.js changes; a cached
        // copy would pin phones to an old version.
        source: "/sw.js",
        headers: [
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Content-Security-Policy", value: "default-src 'self'; script-src 'self'" },
        ],
      },
    ];
  },
};

export default nextConfig;
