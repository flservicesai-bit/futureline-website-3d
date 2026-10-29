/**
 * Shared page metadata — one place for canonical URLs, EN/AR alternates and
 * the share image, so every page tells Google and WhatsApp/LinkedIn the same
 * thing.
 *
 * Paths are locale-less ('' for home, '/faq', …); routing uses
 * localePrefix: 'always', so every public URL is /en/... or /ar/....
 * Relative URLs here resolve against metadataBase (set in the root layout).
 */
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { routing, type Locale } from '@/i18n/routing';

export const SITE_URL = (process.env.NEXTAUTH_URL || 'https://futureline.ai').replace(/\/+$/, '');
export const SITE_NAME = 'FutureLine.ai';

const OG_LOCALE: Record<Locale, string> = { en: 'en_OM', ar: 'ar_OM' };

export function localePath(locale: string, path = ''): string {
  return `/${locale}${path}`;
}

/** hreflang map for a page: one entry per locale plus x-default → English. */
export function languageAlternates(path = ''): Record<string, string> {
  return {
    ...Object.fromEntries(routing.locales.map((l) => [l, localePath(l, path)])),
    'x-default': localePath(routing.defaultLocale, path),
  };
}

export function shareImage(locale: string) {
  return {
    url: `/og/${locale === 'ar' ? 'ar' : 'en'}.jpg`,
    width: 1200,
    height: 630,
    alt: 'FutureLine',
  };
}

type PageMetaInput = {
  locale: string;
  /** Locale-less path: '' for home, '/faq', '/courses/vibe-coding', … */
  path?: string;
  title: string;
  description: string;
  /** Pages that should stay out of search results (sign-in, 404). */
  noIndex?: boolean;
};

export function pageMetadata({ locale, path = '', title, description, noIndex }: PageMetaInput): Metadata {
  const url = localePath(locale, path);
  const image = shareImage(locale);
  const current = (routing.locales.includes(locale as Locale) ? locale : routing.defaultLocale) as Locale;

  return {
    title,
    description,
    alternates: { canonical: url, languages: languageAlternates(path) },
    openGraph: {
      title,
      description,
      url,
      siteName: SITE_NAME,
      locale: OG_LOCALE[current],
      alternateLocale: routing.locales.filter((l) => l !== current).map((l) => OG_LOCALE[l]),
      type: 'website',
      images: [image],
    },
    twitter: { card: 'summary_large_image', title, description, images: [image.url] },
    ...(noIndex ? { robots: { index: false, follow: true } } : {}),
  };
}

/**
 * schema.org Organization for the home page, so search engines can show the
 * company name, logo and location. Add `email`/`telephone` once the public
 * contact details are decided.
 */
export function organizationJsonLd(locale: string, description: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'FutureLine',
    alternateName: SITE_NAME,
    url: `${SITE_URL}/${locale}`,
    logo: `${SITE_URL}/images/logo-dark.png`,
    description,
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'Muscat',
      addressCountry: 'OM',
    },
    areaServed: 'OM',
  };
}

/** JSON for an inline <script>, with '<' escaped so no string can close the tag. */
export function jsonLdScript(data: unknown): string {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}

/** Keys of the `meta` namespace in messages/*.json that hold {title, description}. */
type MetaKey =
  | 'home'
  | 'getStarted'
  | 'courses'
  | 'faq'
  | 'privacy'
  | 'terms'
  | 'login'
  | 'register'
  | 'forgotPassword'
  | 'resetPassword'
  | 'verifyEmail'
  | 'services'
  | 'servicesDigitalisation'
  | 'servicesCustomSoftware'
  | 'servicesConsultation'
  | 'servicesAutomations'
  | 'ai'
  | 'videoLab'
  | 'getStartedDetails'
  | 'getStartedSignin'
  | 'getStartedConfirm';

/**
 * Builds a page's generateMetadata from its translated title/description:
 *   export const generateMetadata = metadataFor('faq', '/faq');
 */
export function metadataFor(key: MetaKey, path: string, options: { noIndex?: boolean } = {}) {
  return async ({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> => {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: 'meta' });
    return pageMetadata({
      locale,
      path,
      title: t(`${key}.title`),
      description: t(`${key}.description`),
      noIndex: options.noIndex,
    });
  };
}
