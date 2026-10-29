const createNextIntlPlugin = require('next-intl/plugin');

// Points next-intl at the per-request config (locale + message catalogue).
const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: ['*.replit.dev', '*.repl.co', '*.spock.replit.dev'],
  // Type errors fail the build (the type-check is clean, and CI runs it on
  // every pull request). The project has no ESLint setup, so linting stays
  // off rather than printing a "not installed" warning on every build.
  eslint: { ignoreDuringBuilds: true },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'img.youtube.com' },
      { protocol: 'https', hostname: 'i.vimeocdn.com' },
      { protocol: 'https', hostname: '*.replit.dev' },
      { protocol: 'https', hostname: '*.repl.co' },
    ]
  },
  experimental: {
    serverActions: {
      allowedOrigins: [
        'localhost:5000',
        '*.replit.dev',
        '*.repl.co',
      ]
    }
  },
  async headers() {
    // Public media is served with max-age=0 by default, so every visit
    // re-checked the hero video. A week of caching, then a background
    // refresh; a day for share images and posters, which change more often.
    const mediaCache = 'public, max-age=604800, stale-while-revalidate=86400';
    const imageCache = 'public, max-age=86400, stale-while-revalidate=604800';
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
        ],
      },
      { source: '/og/:file*', headers: [{ key: 'Cache-Control', value: imageCache }] },
      { source: '/hero/:file*', headers: [{ key: 'Cache-Control', value: imageCache }] },
      { source: '/images/:file*', headers: [{ key: 'Cache-Control', value: imageCache }] },
      { source: '/brand/:file*', headers: [{ key: 'Cache-Control', value: imageCache }] },
      // Last, so videos under /hero/ get the media policy, not the image one.
      { source: '/:file(.*\\.mp4)', headers: [{ key: 'Cache-Control', value: mediaCache }] },
    ];
  },
};

module.exports = withNextIntl(nextConfig);
