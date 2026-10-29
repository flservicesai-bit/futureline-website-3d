/**
 * Locale routing.
 *
 * Every page lives under a locale prefix: English at /en/*, Arabic at /ar/*
 * (localePrefix 'always', see the note below for why). Unprefixed URLs from
 * before the switch (/courses, /services/...) redirect to the visitor's
 * language, so old links keep working.
 *
 * Note: bilingual support was removed at one point and then restored by
 * request — see the git history around "remove Arabic/bilingual support"
 * and its revert if any Arabic-specific asset looks unexpectedly missing.
 */
import { defineRouting } from 'next-intl/routing'
import { createNavigation } from 'next-intl/navigation'

export const locales = ['en', 'ar'] as const
export type Locale = (typeof locales)[number]

export const routing = defineRouting({
  locales,
  defaultLocale: 'en',
  localePrefix: 'always',
  // NOTE: switched from 'as-needed' to 'always'. next-intl 4.13.x + Next 15.5.12
  // has a defect where 'as-needed' emits a rewrite (/en) AND a 307 to '/' on the
  // same response for the default locale, causing an infinite redirect loop that
  // took the entire English site down (only /ar worked). 'always' resolves it and
  // auto-redirects old unprefixed URLs (/courses -> /en/courses), so inbound links
  // still work. Revisit 'as-needed' once the upstream incompatibility is fixed.
})

/** Text direction per locale — drives <html dir> and RTL-aware layout. */
export const localeDirection: Record<Locale, 'ltr' | 'rtl'> = {
  en: 'ltr',
  ar: 'rtl',
}

export const localeNames: Record<Locale, string> = {
  en: 'English',
  ar: 'العربية',
}

// Locale-aware replacements for next/link and next/navigation.
export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing)
