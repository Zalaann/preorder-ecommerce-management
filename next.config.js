/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // Show linting warnings but don't fail the build
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Warning: This allows production builds to successfully complete even if
    // your project has TypeScript errors.
    ignoreBuildErrors: true,
  },
  reactStrictMode: true,
  images: {
    domains: ['drweglminexwawkjjjkv.supabase.co'],
  },
};

module.exports = nextConfig; 