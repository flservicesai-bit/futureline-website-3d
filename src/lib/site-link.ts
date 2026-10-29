/**
 * Absolute link into the site for emails, in the visitor's language (from the
 * NEXT_LOCALE cookie next-intl sets). APP_URL should be set in production;
 * without it the request's own host is used.
 */
export function siteLink(req: Request, path: string): string {
  const base =
    process.env.APP_URL ||
    `${req.headers.get('x-forwarded-proto') || 'http'}://${req.headers.get('host') || 'localhost:5000'}`;
  const locale = /(?:^|;\s*)NEXT_LOCALE=ar(?:;|$)/.test(req.headers.get('cookie') || '') ? 'ar' : 'en';
  return `${base.replace(/\/$/, '')}/${locale}${path}`;
}
