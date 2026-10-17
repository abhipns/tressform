/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // 17.10.2026: which upload this copy of the site was built from. The
  // browser compares it with /api/version (components/VersionWatch.tsx) and
  // reloads when a newer version is live.
  env: {
    NEXT_PUBLIC_TF_BUILD: process.env.VERCEL_GIT_COMMIT_SHA || "dev",
  },
};

export default nextConfig;
