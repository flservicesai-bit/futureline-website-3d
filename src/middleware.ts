import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import createIntlMiddleware from 'next-intl/middleware';
import { routing, locales } from '@/i18n/routing';

function addSecurityHeaders(response: NextResponse) {
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=()'
  );
  response.headers.set(
    'Strict-Transport-Security',
    'max-age=31536000; includeSubDomains'
  );
  response.headers.set(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https:; frame-src 'self' https://player.vimeo.com https://www.youtube.com"
  );
  return response;
}

const intlMiddleware = createIntlMiddleware(routing);

/**
 * Strips a leading locale segment so route guards can match on the
 * locale-independent path: /en/admin and /ar/admin are both admin. Unprefixed
 * paths (/admin) still reach here before next-intl redirects them, so they
 * are matched as they are.
 */
function stripLocale(pathname: string) {
  const segments = pathname.split('/');
  if (locales.includes(segments[1] as (typeof locales)[number])) {
    return '/' + segments.slice(2).join('/');
  }
  return pathname;
}

/** Preserves the caller's locale prefix when redirecting to an app route. */
function localeAwareUrl(path: string, request: NextRequest) {
  const segments = request.nextUrl.pathname.split('/');
  const prefix = locales.includes(segments[1] as (typeof locales)[number])
    ? `/${segments[1]}`
    : '';
  return new URL(`${prefix}${path}`, request.url);
}

// Signed-in areas. Each layout checks the role again on the server; this
// guard makes sure a signed-out visitor comes back to the exact page.
const PORTALS = ['/admin', '/instructor', '/dashboard'];

export async function middleware(request: NextRequest) {
  const pathWithoutLocale = stripLocale(request.nextUrl.pathname);
  const portal = PORTALS.find(
    (area) => pathWithoutLocale === area || pathWithoutLocale.startsWith(`${area}/`)
  );

  // Auth guard runs before locale rewriting: an unauthenticated visitor to
  // /ar/admin should be redirected to /ar/login, not rewritten first.
  if (portal) {
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET || process.env.SESSION_SECRET,
    });

    if (!token) {
      const loginUrl = localeAwareUrl('/login', request);
      loginUrl.searchParams.set(
        'callbackUrl',
        request.nextUrl.pathname + request.nextUrl.search
      );
      return addSecurityHeaders(NextResponse.redirect(loginUrl));
    }

    if (portal === '/admin' && (token as any).role !== 'ADMIN') {
      return addSecurityHeaders(
        NextResponse.redirect(localeAwareUrl('/dashboard', request))
      );
    }
  }

  // next-intl resolves the locale and rewrites to the [locale] segment.
  return addSecurityHeaders(intlMiddleware(request));
}

export const config = {
  matcher: [
    // Skip: API routes (must not be locale-rewritten), Next internals, and
    // anything with a file extension. That last exclusion matters — public
    // assets like /hero/hero-640.mp4 and /favicon.ico would otherwise be rewritten to
    // /en/hero/hero-640.mp4 and 500.
    '/((?!api|_next/static|_next/image|.*\\..*).*)',
  ],
};
