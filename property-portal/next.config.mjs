/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: { ignoreDuringBuilds: true },

  experimental: {
    // Keep rendered pages in the router's in-memory cache for a short while so
    // going back to a page you just came from is instant instead of a fresh
    // round trip to the database. This cache lives in the tab's memory only —
    // never on disk — and any mutation calls router.refresh(), which discards
    // it, so edits still show up immediately.
    staleTimes: {
      dynamic: 30,
      static: 180,
    },
  },
};

export default nextConfig;
