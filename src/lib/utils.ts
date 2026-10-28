import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPrice(price: number): string {
  return new Intl.NumberFormat('en-OM', {
    style: 'currency',
    currency: 'OMR',
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  }).format(price);
}

// Placeholder origin for resolving relative paths; any off-site path resolves
// to a different origin, so this works without `window` (SSR included).
const SAME_SITE_ORIGIN = 'https://same-site.invalid';

/**
 * Returns `requested` as a same-site path, or null if it would leave the site.
 * A plain "starts with / but not //" check is not enough: browsers read `\`
 * as `/` and drop tabs, so `/\evil.com` and `/<tab>/evil.com` both open
 * evil.com. Resolving the URL and comparing origins catches every variant.
 */
export function safeCallbackPath(requested: string | null | undefined): string | null {
  if (!requested || !requested.startsWith('/')) return null;
  try {
    const url = new URL(requested, SAME_SITE_ORIGIN);
    if (url.origin !== SAME_SITE_ORIGIN) return null;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return null;
  }
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
