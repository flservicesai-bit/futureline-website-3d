/**
 * 404 for every unmatched URL, in the visitor's language.
 *
 * Lives outside the [locale] tree (Next serves the root not-found for unknown
 * paths), so it adds the site Header/Footer itself. The locale still comes
 * from next-intl's request context, which the middleware resolves from the
 * /en or /ar prefix.
 *
 * The "404" used to be a white-to-transparent gradient left over from the
 * dark theme, which made it invisible on the light canvas.
 */
import type { Metadata } from 'next';
import { getLocale, getTranslations } from 'next-intl/server';
import { Home, BookOpen } from 'lucide-react';
import { Link } from '@/i18n/routing';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const t = await getTranslations({ locale, namespace: 'meta' });
  // No robots tag here: Next already marks 404 responses noindex.
  return {
    title: t('notFound.title'),
    description: t('notFound.description'),
  };
}

export default async function NotFound() {
  const t = await getTranslations('notFound');

  return (
    <>
      <Header />
      <main className="relative flex min-h-[80vh] items-center justify-center overflow-hidden bg-canvas px-4 pb-20 pt-32">
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-1/2 h-[300px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-teal/[0.08] blur-[120px]"
        />

        <div className="relative w-full max-w-md text-center">
          <p className="mb-6 inline-flex items-center gap-2 rounded-pill border border-teal/20 bg-teal/10 px-3 py-1.5 font-display text-xs font-semibold uppercase tracking-[0.14em] text-teal">
            <span className="h-1.5 w-1.5 rounded-full bg-teal" />
            {t('eyebrow')}
          </p>

          <p
            aria-hidden
            className="mb-2 select-none bg-gradient-to-r from-navy via-teal to-mint bg-clip-text font-display text-[120px] font-bold leading-none text-transparent"
          >
            404
          </p>

          <h1 className="mb-3 font-display text-2xl font-bold tracking-tight text-navy">{t('title')}</h1>
          <p className="mb-10 text-sm leading-relaxed text-ink-muted">{t('body')}</p>

          <div className="flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              href="/"
              className="inline-flex items-center justify-center gap-2 rounded-pill bg-gradient-to-r from-navy via-teal to-mint px-6 py-3 font-display text-sm font-semibold text-white transition-transform duration-300 hover:-translate-y-0.5"
            >
              <Home size={15} />
              {t('home')}
            </Link>
            <Link
              href="/courses"
              className="inline-flex items-center justify-center gap-2 rounded-pill border border-hairline bg-canvas-card px-6 py-3 font-display text-sm font-semibold text-navy transition-colors hover:border-teal/40"
            >
              <BookOpen size={15} />
              {t('courses')}
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
