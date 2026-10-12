import { MetadataRoute } from 'next';
import { routing } from '@/i18n/routing';
import { SITE_URL } from '@/lib/seo';

// Public pages are allowed by default. Portals sit under /en/... and /ar/...
// (localePrefix: 'always'), so each private area is listed for both locales
// as well as bare, which only redirects.
const PRIVATE_AREAS = ['/admin', '/instructor', '/dashboard'];

export default function robots(): MetadataRoute.Robots {
  const prefixes = ['', ...routing.locales.map((l) => `/${l}`)];
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',
          ...prefixes.flatMap((p) => PRIVATE_AREAS.map((area) => `${p}${area}`)),
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
