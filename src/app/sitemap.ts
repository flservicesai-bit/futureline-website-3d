import { MetadataRoute } from 'next';
import { prisma } from '@/lib/prisma';
import { routing } from '@/i18n/routing';
import { SITE_URL, languageAlternates } from '@/lib/seo';

// Rebuilt hourly so newly published courses appear without a redeploy.
export const revalidate = 3600;

type Entry = {
  path: string;
  changeFrequency: NonNullable<MetadataRoute.Sitemap[number]['changeFrequency']>;
  priority: number;
  lastModified?: Date;
};

// Every public URL lives under /en or /ar (localePrefix: 'always'), so each
// page is listed once per language with hreflang alternates pointing at its
// twin. Unprefixed URLs only redirect and don't belong here.
const STATIC_PAGES: Entry[] = [
  { path: '', changeFrequency: 'weekly', priority: 1 },
  { path: '/get-started', changeFrequency: 'monthly', priority: 0.9 },
  { path: '/courses', changeFrequency: 'weekly', priority: 0.9 },
  { path: '/audit', changeFrequency: 'monthly', priority: 0.8 },
  { path: '/faq', changeFrequency: 'monthly', priority: 0.6 },
  { path: '/services', changeFrequency: 'monthly', priority: 0.5 },
  { path: '/services/digitalisation', changeFrequency: 'monthly', priority: 0.5 },
  { path: '/services/custom-software', changeFrequency: 'monthly', priority: 0.5 },
  { path: '/services/consultation', changeFrequency: 'monthly', priority: 0.5 },
  { path: '/services/automations', changeFrequency: 'monthly', priority: 0.5 },
  { path: '/ai', changeFrequency: 'monthly', priority: 0.5 },
  { path: '/privacy', changeFrequency: 'yearly', priority: 0.3 },
  { path: '/terms', changeFrequency: 'yearly', priority: 0.3 },
];

function localized(entry: Entry): MetadataRoute.Sitemap {
  // Same alternates as the pages' own hreflang tags, x-default included.
  const languages = Object.fromEntries(
    Object.entries(languageAlternates(entry.path)).map(([l, p]) => [l, `${SITE_URL}${p}`]),
  );
  return routing.locales.map((locale) => ({
    url: `${SITE_URL}/${locale}${entry.path}`,
    // Only when it is known: "modified now" on every fetch taught search
    // engines to ignore the field.
    ...(entry.lastModified ? { lastModified: entry.lastModified } : {}),
    changeFrequency: entry.changeFrequency,
    priority: entry.priority,
    alternates: { languages },
  }));
}

async function coursePages(): Promise<Entry[]> {
  try {
    const courses = await prisma.course.findMany({
      // Same filter as /courses, including its guard against the placeholder
      // "Test" course.
      where: {
        status: 'PUBLISHED',
        approvalStatus: 'APPROVED',
        NOT: { title: { equals: 'Test', mode: 'insensitive' } },
      },
      select: { slug: true, createdAt: true },
    });
    return courses.map((c) => ({
      path: `/courses/${c.slug}`,
      changeFrequency: 'weekly' as const,
      priority: 0.7,
      lastModified: c.createdAt,
    }));
  } catch (error) {
    // Without the database (local builds, an outage) still serve the static
    // pages rather than failing the whole sitemap.
    console.error('sitemap: could not load courses', error);
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  return [...STATIC_PAGES, ...(await coursePages())].flatMap(localized);
}
