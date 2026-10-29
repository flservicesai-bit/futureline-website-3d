/**
 * Root layout — owns <html>/<body> for the whole app.
 *
 * The html tag lives here rather than in [locale]/layout.tsx because files
 * outside the locale tree (not-found.tsx, global-error.tsx) still need a root
 * layout; without one Next fails the build with "doesn't have a root layout".
 * The locale is read from next-intl's request context (resolved by the
 * middleware) so lang/dir are correct per request — which is what makes
 * Arabic render RTL.
 */
import type { Metadata } from 'next';
import { Inter, Space_Grotesk, Noto_Sans_Arabic } from 'next/font/google';
import { GeistMono } from 'geist/font/mono';
import { getLocale } from 'next-intl/server';
import './globals.css';
import { Providers } from '@/components/Providers';
import { localeDirection, type Locale } from '@/i18n/routing';
import { SITE_NAME, SITE_URL, shareImage } from '@/lib/seo';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });

// Display face for headings and the wordmark treatment.
const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-display',
  display: 'swap',
});

// Arabic face. Non-optional: neither Inter nor Space Grotesk carries Arabic
// glyphs, so the bilingual copy would render as tofu without it.
// next/font self-hosts these at build time — required here, because the app's
// CSP sets font-src 'self' data:, which blocks the Google Fonts CDN outright.
const notoArabic = Noto_Sans_Arabic({
  subsets: ['arabic'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-arabic',
  display: 'swap',
});

// Defaults for any page without its own metadata. metadataBase turns the
// relative canonical/og:url/og:image paths that pages emit into absolute
// https://futureline.ai URLs, which link previews and search engines need.
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: 'FutureLine.ai — AI Consulting · Applications · Training',
  description:
    'An Omani company turning AI from talk into practice — we advise, we build, and we train. Muscat, Sultanate of Oman.',
  openGraph: {
    siteName: SITE_NAME,
    type: 'website',
    images: [shareImage('en')],
  },
  twitter: { card: 'summary_large_image', images: [shareImage('en').url] },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  const dir = localeDirection[locale as Locale] ?? 'ltr';

  return (
    <html
      lang={locale}
      dir={dir}
      className={`${inter.variable} ${spaceGrotesk.variable} ${notoArabic.variable} ${GeistMono.variable}`}
    >
      <body className="font-sans antialiased">
        {/* No NextIntlClientProvider here: [locale]/layout.tsx provides the
            client messages for every page. The root not-found page, outside
            the [locale] tree, wraps itself in its own provider. */}
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
