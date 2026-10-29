/**
 * Locale layout — validates the segment and opts the subtree into static
 * rendering. <html>/<body>, fonts and providers live in the root layout
 * (src/app/layout.tsx); see the note there for why.
 */
import { notFound } from 'next/navigation';
import { hasLocale, NextIntlClientProvider } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';
import { routing } from '@/i18n/routing';
import { HtmlLangSync } from '@/components/HtmlLangSync';
import { clientMessages } from '@/i18n/client-namespaces';

/** Pre-render both locale shells at build time. */
export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();

  // Without this, any page using a translation hook opts out of static
  // rendering for the whole subtree.
  setRequestLocale(locale);

  // Provide messages HERE (not only in the root layout). A client-side
  // language switch re-renders this [locale] layout but NOT the root layout,
  // so the root's NextIntlClientProvider would keep serving the previous
  // locale's messages to client components. This inner provider re-renders
  // with the switched locale, and HtmlLangSync flips <html lang/dir> to match.
  // Only the namespaces client components use; see client-namespaces.ts.
  const messages = clientMessages(await getMessages());

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <HtmlLangSync locale={locale} />
      {children}
    </NextIntlClientProvider>
  );
}
