/**
 * Header — light glass navigation for the redesigned public site.
 *
 * Nav now follows the company profile's three pillars rather than the old
 * four-service taxonomy. Same-page anchors are routed through scrollToHash so
 * they drive Lenis instead of fighting it, and they are written absolute
 * ("/#services") so they still work from /courses or /login.
 *
 * Links use the locale-aware Link from @/i18n/routing: with localePrefix
 * 'as-needed' a plain next/link would drop an Arabic visitor back into
 * English on every navigation.
 */
'use client';

import Image from 'next/image';
import { useSession, signOut } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { Menu, X } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { Link, usePathname } from '@/i18n/routing';
import { LocaleSwitcher } from '@/components/ui/LocaleSwitcher';
import { scrollToHash } from '@/lib/scroll';
import { AccountMenu } from '@/components/AccountMenu';

/**
 * Freeze the document while the mobile menu is open. Lenis owns scrolling when
 * motion is allowed (stop() also toggles its own `lenis-stopped` overflow rule);
 * under prefers-reduced-motion there is no Lenis and native scroll owns the
 * page — so lock <html> overflow as well. Both helpers are idempotent.
 */
function lockPageScroll() {
  window.__flLenis?.stop?.();
  document.documentElement.style.overflow = 'hidden';
}
function unlockPageScroll() {
  document.documentElement.style.overflow = '';
  window.__flLenis?.start?.();
}

export default function Header() {
  const { data: session } = useSession();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const t = useTranslations('nav');
  const locale = useLocale();
  const pathname = usePathname();

  // The home hero is dark, so over it (top of the home page, before the nav
  // gains its glass background) the nav text flips to light so it stays
  // readable — same transparent bar, same items, just legible on dark.
  const overDarkHero = pathname === '/' && !scrolled && !mobileOpen;

  // Transparent over the hero, glass + hairline once past the fold.
  useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => setScrolled(window.scrollY > 32));
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  // Lock the page behind the open mobile menu; the cleanup unlocks on close or
  // unmount. Without this the page kept scrolling under the (previously
  // transparent) menu, so page text and menu items overlapped.
  useEffect(() => {
    if (!mobileOpen) return;
    lockPageScroll();
    return unlockPageScroll;
  }, [mobileOpen]);

  // Any route change (link, back/forward, programmatic) closes the menu, so it
  // can't be left open — and the page left locked — on the next page.
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Anchors point at home-page sections; absolute so they work from any route.
  // '/get-started' and '/faq' are real routes (no anchor field), not
  // same-page anchors — the 3 options and the FAQ live off the home page.
  //
  // No "Vision" entry: removed by request. The vision now surfaces as a
  // labelled cluster in the story scene rather than as its own nav
  // destination. The nav.vision i18n key is left in messages/en.json,
  // unused, in case it comes back.
  const navLinks = [
    { href: '/get-started', label: t('whatWeOffer') },
    { href: '/#who-we-serve', label: t('whoWeServe'), anchor: '#who-we-serve' },
    { href: '/courses', label: t('courses') },
    { href: '/faq', label: t('faq') },
  ];

  // `fl-light` is what defines the glass variables (--fl-glass-*), and they are
  // deliberately scoped to it rather than :root (see globals.css). Pages opt in
  // on their <main>, but this header is a sibling of <main>, not a child — so
  // without opting in here, `.fl-glass-strong` resolved to a transparent bar
  // with no blur: the desktop header had no frost when scrolled, and the open
  // mobile menu was fully see-through.
  const headerClass = [
    'fl-light sticky top-0 z-50 transition-[background-color,backdrop-filter,border-color] duration-500',
    scrolled || mobileOpen
      ? 'fl-glass-strong border-b border-hairline'
      : overDarkHero
        ? // Over the dark hero: 30% transparent (70% opaque) dark glass, so
          // the hero behind is slightly visible through the bar, aligned with
          // the section behind it.
          'bg-[#081a2e]/70 backdrop-blur-md border-b border-white/10'
        : 'bg-transparent border-b border-transparent',
  ].join(' ');

  const linkClass = overDarkHero
    ? 'font-display text-[13px] font-medium text-white/85 transition-colors hover:text-white'
    : 'font-display text-[13px] font-medium text-ink-muted transition-colors hover:text-navy';

  /** Same-page anchors: drive Lenis rather than letting the browser jump. */
  const onAnchorClick = (e: React.MouseEvent, anchor?: string) => {
    if (!anchor) return;
    if (window.location.pathname.replace(/^\/(en|ar)(?=\/|$)/, '') !== '') return;
    e.preventDefault();
    setMobileOpen(false);
    // Two things must happen before scrolling, and neither has by the time this
    // handler runs: (1) the lock effect's cleanup restarts Lenis only after React
    // commits, and scrollTo on a stopped Lenis is a no-op; (2) the open menu makes
    // the header ~370px tall, so measuring the target now and then collapsing the
    // menu shifts the page ~300px and lands past the section (was a 243px
    // overshoot on mobile). Defer one frame so the menu has closed, then release
    // the lock and scroll against the real layout.
    requestAnimationFrame(() => {
      unlockPageScroll();
      scrollToHash(anchor);
    });
  };

  return (
    <header className={headerClass} aria-label="Primary">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <Link
            href="/"
            className="group flex items-center gap-2.5"
            aria-label="FutureLine home"
            data-cursor="hover"
          >
            {/* The brand mark, exactly as designed — original colours, shape
                and size. A thin white outline (fl-logo-stroke) traces its
                silhouette so the edges read cleanly on the dark hero; the
                original teal glow is folded into that same filter. */}
            <Image
              src="/images/logo-mark.png"
              alt=""
              width={30}
              height={30}
              className="fl-logo-stroke h-[30px] w-[30px]"
              priority
            />
            <span
              className={`font-display text-lg font-bold tracking-tight ${
                overDarkHero ? 'text-white' : 'text-navy'
              }`}
            >
              FutureLine
            </span>
          </Link>

          <nav className="hidden items-center gap-6 md:flex lg:gap-7" aria-label="Main">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={linkClass}
                onClick={(e) => onAnchorClick(e, link.anchor)}
                data-cursor="hover"
              >
                {link.label}
              </Link>
            ))}
            {/* Language switcher sits inside the nav, alongside the links,
                rather than over with the auth buttons — placed here by
                request. */}
            <LocaleSwitcher tone={overDarkHero ? 'dark' : 'light'} />
          </nav>

          <div className="hidden items-center gap-3 md:flex">
            {session ? (
              /* Signed in: identity + account actions behind an avatar, rather
                 than a growing row of bare text links. */
              <AccountMenu user={session.user as any} dark={overDarkHero} />
            ) : (
              /* The "Readiness assessment" CTA that sat next to Sign In was
                 removed by request. /audit is still reachable from the
                 footer and from the Get Started flow. */
              <Link href="/login" className={linkClass} data-cursor="hover">
                {t('signIn')}
              </Link>
            )}
          </div>

          <button
            className={`p-2 transition-colors md:hidden ${
              overDarkHero ? 'text-white/85 hover:text-white' : 'text-ink-muted hover:text-navy'
            }`}
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        {mobileOpen && (
          <div className="flex flex-col gap-1 border-t border-hairline py-3 md:hidden">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-md px-3 py-2.5 font-display text-sm font-medium text-ink-muted transition-colors hover:bg-canvas-alt hover:text-navy"
                onClick={(e) => {
                  onAnchorClick(e, link.anchor);
                  setMobileOpen(false);
                }}
              >
                {link.label}
              </Link>
            ))}
            {/* Same switcher in the mobile menu — the desktop nav is hidden
                below md, so without this there'd be no way to change
                language on a phone. */}
            <div className="px-3 py-2">
              <LocaleSwitcher />
            </div>
            <div className="my-2 h-px bg-hairline" />
            {session ? (
              <>
                <Link
                  href={
                    session.user.role === 'ADMIN'
                      ? '/admin'
                      : session.user.role === 'INSTRUCTOR'
                        ? '/instructor'
                        : '/dashboard'
                  }
                  className="rounded-md px-3 py-2.5 font-display text-sm font-medium text-ink-muted transition-colors hover:bg-canvas-alt hover:text-navy"
                  onClick={() => setMobileOpen(false)}
                >
                  {t('dashboard')}
                </Link>
                <button
                  onClick={() => signOut({ callbackUrl: `/${locale}` })}
                  className="rounded-md px-3 py-2.5 text-start font-display text-sm font-medium text-ink-muted transition-colors hover:bg-canvas-alt hover:text-navy"
                >
                  {t('signOut')}
                </button>
              </>
            ) : (
              /* Readiness assessment CTA removed here too, matching the
                 desktop header. */
              <Link
                href="/login"
                className="rounded-md px-3 py-2.5 font-display text-sm font-medium text-ink-muted transition-colors hover:bg-canvas-alt hover:text-navy"
                onClick={() => setMobileOpen(false)}
              >
                {t('signIn')}
              </Link>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
