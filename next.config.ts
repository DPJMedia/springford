import type { NextConfig } from "next";

// Detect `next dev` reliably from argv. We intentionally avoid relying on
// NODE_ENV here because next.config.ts is loaded before NODE_ENV is set in
// some Next.js paths.
const isDevCommand =
  process.argv.some((arg) => arg === "dev") ||
  process.env.NEXT_DEV_COMMAND === "1";

// Local-dev-only fix for macOS + iCloud Drive (com~apple~CloudDocs).
// iCloud's file provider periodically syncs/evicts files inside `.next/`,
// which causes random `ENOENT: routes-manifest.json` 500s and stalls during
// webpack compilation. Naming the dev build dir with a `.nosync` suffix tells
// macOS/iCloud to permanently ignore it, so files Next.js writes stay put.
//
// Production builds (`next build`, Vercel) keep using the default `.next/`
// directory unchanged.
const nextConfig: NextConfig = {
  async headers() { return [{ source: "/(.*)", headers: [
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    { key: "X-Frame-Options", value: "SAMEORIGIN" },
    { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
    { key: "Content-Security-Policy", value: "object-src 'none'; base-uri 'self'; frame-ancestors 'self'" },
  ] }]; },
  ...(isDevCommand ? { distDir: ".next.nosync" } : {}),
};

export default nextConfig;
