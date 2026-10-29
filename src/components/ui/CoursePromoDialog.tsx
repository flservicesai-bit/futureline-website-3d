/**
 * CoursePromoDialog — "Vibe Coding — coming soon" waitlist promo.
 *
 * Appears once per browsing session, 8s after the visitor lands. Two views in
 * one dialog:
 *
 *   promo   → the offer, with three actions:
 *               • Join the waitlist  → Google sign-in (captures the person)
 *               • Learn more         → the details view
 *               • Maybe later        → dismiss
 *   details → a scrollable brief on the course, with a way back and out.
 *
 * Joining sends the visitor through Google OAuth and returns them to the
 * course page carrying ?waitlist=vibe-coding, where WaitlistRecorder logs the
 * signed-in person as a tagged lead — otherwise "join the waitlist" would just
 * be a sign-in button and you would have no idea who wanted the course. Anyone
 * already signed in skips Google and goes straight there.
 *
 * Deliberately restrained about when it shows: once closed or joined it stays
 * away for SNOOZE_MS on that device (localStorage — sessionStorage alone
 * brought it back on every new visit and every new tab), never on the auth
 * screens, the get-started funnel or the portals — interrupting someone mid
 * sign-in or mid-checkout costs more than the ad gains — and never on the
 * course pages, which already sell the course it is advertising.
 *
 * Accessibility: real modal semantics, focus moves in and is restored on
 * close, Escape and backdrop dismiss, Tab is trapped, entrance animation is
 * motion-safe only.
 */
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { getProviders, signIn, useSession } from 'next-auth/react';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { usePathname } from '@/i18n/routing';
import { X, ArrowRight, ArrowLeft, Check, Loader2 } from 'lucide-react';

const STORAGE_KEY = 'fl.promo.vibe-coding.closedAt';
/** Older per-tab flag; still honoured so nobody sees it twice in one visit. */
const SESSION_KEY = 'fl.promo.vibe-coding.seen';
const SNOOZE_MS = 14 * 24 * 60 * 60 * 1000;
const DELAY_MS = 8000;
const COURSE_PATH = '/courses/vibe-coding';

function rememberClosed() {
  try {
    localStorage.setItem(STORAGE_KEY, String(Date.now()));
  } catch {
    /* storage blocked — fall back to the per-tab flag below */
  }
  try {
    sessionStorage.setItem(SESSION_KEY, '1');
  } catch {
    /* private mode — it just shows again next navigation */
  }
}

function closedRecently(): boolean {
  try {
    if (sessionStorage.getItem(SESSION_KEY) === '1') return true;
  } catch {
    /* ignore */
  }
  try {
    const closedAt = Number(localStorage.getItem(STORAGE_KEY));
    return closedAt > 0 && Date.now() - closedAt < SNOOZE_MS;
  } catch {
    return false;
  }
}

/** Route prefixes where a promo would interrupt real work or repeat the page. */
const SUPPRESSED = [
  '/courses',
  // Pages built around a form or upload: the audit request, the service
  // enquiry forms and the video lab.
  '/audit',
  '/services',
  '/lab',
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/get-started',
  '/admin',
  '/instructor',
  '/dashboard',
];

export function CoursePromoDialog() {
  const t = useTranslations('promo');
  const locale = useLocale();
  const pathname = usePathname(); // locale-stripped by @/i18n/routing
  const router = useRouter();
  const { status } = useSession();
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<'promo' | 'details'>('promo');
  const [joining, setJoining] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const restoreFocusTo = useRef<HTMLElement | null>(null);

  const suppressed = SUPPRESSED.some((p) => pathname.startsWith(p));

  const close = useCallback(() => {
    setOpen(false);
    rememberClosed();
    restoreFocusTo.current?.focus?.();
  }, []);

  async function join() {
    setJoining(true);
    rememberClosed();

    // next-intl's router silently drops a query string off a string href, and
    // the ?waitlist= parameter is the whole point — so this uses the plain
    // Next router and carries the locale prefix by hand, the same way
    // signIn()'s callbackUrl has to.
    const next = `/${locale}${COURSE_PATH}?waitlist=vibe-coding`;

    // Already signed in? Don't march them back through Google — we know who
    // they are, so go straight to the course page and record them there.
    if (status === 'authenticated') {
      setOpen(false);
      router.push(next);
      return;
    }

    // Google is only a registered provider once the OAuth secrets are set. If
    // it isn't, fall back to our own branded sign-in rather than dead-ending
    // on NextAuth's default page.
    const providers = await getProviders().catch(() => null);
    if (providers?.google) {
      signIn('google', { callbackUrl: next });
    } else {
      router.push(`/${locale}/login?callbackUrl=${encodeURIComponent(next)}`);
    }
  }

  useEffect(() => {
    if (suppressed || closedRecently()) return;
    // setTimeout, not rAF: rAF is suspended in a background tab and would fire
    // the promo the instant someone switches back.
    const id = window.setTimeout(() => setOpen(true), DELAY_MS);
    return () => window.clearTimeout(id);
  }, [suppressed]);

  useEffect(() => {
    if (!open) return;
    restoreFocusTo.current = document.activeElement as HTMLElement;
    panelRef.current?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        close();
        return;
      }
      if (e.key !== 'Tab' || !panelRef.current) return;
      const focusable = panelRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled])',
      );
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, close]);

  if (!open) return null;

  const bullets = [t('detailsCover1'), t('detailsCover2'), t('detailsCover3'), t('detailsCover4')];
  const facts: [string, string][] = [
    [t('factLevel'), t('factLevelValue')],
    [t('factFormat'), t('factFormatValue')],
    [t('factDuration'), t('factDurationValue')],
    [t('factDates'), t('factDatesValue')],
  ];

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center p-4 sm:items-center" role="presentation">
      <div
        className="absolute inset-0 bg-navy/40 backdrop-blur-[2px] motion-safe:animate-[fadeIn_.25s_ease-out]"
        onClick={close}
        aria-hidden
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="promo-title"
        tabIndex={-1}
        className="fl-light relative flex max-h-[88vh] w-full max-w-[460px] flex-col overflow-hidden rounded-card border border-hairline bg-canvas-card text-ink outline-none fl-elev-3 motion-safe:animate-[promoIn_.35s_cubic-bezier(.16,1,.3,1)]"
      >
        <div className="h-1.5 w-full shrink-0 bg-gradient-to-r from-navy via-teal to-mint" />

        <button
          type="button"
          onClick={close}
          aria-label={t('close')}
          className="absolute end-3 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-canvas-alt hover:text-navy"
        >
          <X size={16} aria-hidden />
        </button>

        {view === 'promo' ? (
          <div className="p-7">
            <div className="mb-3 flex items-center gap-2">
              <p className="font-display text-[11px] font-semibold uppercase tracking-[0.3em] text-teal-ink">
                {t('eyebrow')}
              </p>
              <span className="rounded-full border border-hairline px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.2em] text-ink-muted">
                {t('levelBadge')}
              </span>
            </div>

            <h2 id="promo-title" className="font-display text-3xl font-bold leading-[1.1] tracking-tight text-navy">
              {t('title')}
            </h2>

            <p className="mt-3 text-sm leading-relaxed text-ink-muted">{t('tagline')}</p>

            <div className="mt-6 flex items-baseline gap-3">
              <span className="font-display text-3xl font-bold tracking-tight text-navy">
                {t('priceNow')}
              </span>
              <span className="font-display text-lg text-ink-muted line-through decoration-ink-muted/50">
                {t('priceWas')}
              </span>
            </div>
            <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.2em] text-teal-ink">
              {t('priceNote')}
            </p>

            <button
              type="button"
              onClick={join}
              disabled={joining}
              className="fl-submit mt-6"
              data-cursor="magnetic"
            >
              {joining ? <Loader2 size={15} className="animate-spin" aria-hidden /> : null}
              {t('cta')}
              {!joining && <ArrowRight size={15} className="rtl:rotate-180" aria-hidden />}
            </button>

            <button
              type="button"
              onClick={() => setView('details')}
              className="fl-submit-ghost mt-3"
              data-cursor="hover"
            >
              {t('learnMore')}
            </button>

            <button
              type="button"
              onClick={close}
              className="mx-auto mt-3 block text-xs font-medium text-ink-muted transition-colors hover:text-navy"
            >
              {t('dismiss')}
            </button>
          </div>
        ) : (
          <>
            <div className="shrink-0 px-7 pt-6">
              <h2 id="promo-title" className="font-display text-2xl font-bold tracking-tight text-navy">
                {t('detailsTitle')}
              </h2>
            </div>

            {/* The scrollable brief. data-lenis-prevent stops the page's smooth
                scroll from swallowing wheel events over the panel. */}
            <div
              data-lenis-prevent
              className="min-h-0 flex-1 space-y-5 overflow-y-auto px-7 py-5 text-sm leading-relaxed text-ink-muted"
            >
              <p>{t('detailsIntro')}</p>
              <p>{t('detailsNotFor')}</p>

              <div>
                <p className="mb-2 font-display text-[11px] font-semibold uppercase tracking-[0.3em] text-teal-ink">
                  {t('detailsCoverTitle')}
                </p>
                <ul className="space-y-2">
                  {bullets.map((b) => (
                    <li key={b} className="flex gap-2.5">
                      <Check size={15} className="mt-0.5 shrink-0 text-teal-ink" aria-hidden />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <p className="mb-2 font-display text-[11px] font-semibold uppercase tracking-[0.3em] text-teal-ink">
                  {t('detailsOutcomeTitle')}
                </p>
                <p>{t('detailsOutcome')}</p>
              </div>

              <div>
                <p className="mb-2 font-display text-[11px] font-semibold uppercase tracking-[0.3em] text-teal-ink">
                  {t('detailsFactsTitle')}
                </p>
                <dl className="space-y-2">
                  {facts.map(([k, v]) => (
                    <div key={k} className="flex gap-3">
                      <dt className="w-24 shrink-0 font-mono text-[10px] uppercase tracking-[0.15em] text-ink-muted/80">
                        {k}
                      </dt>
                      <dd className="flex-1 text-ink">{v}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            </div>

            <div className="shrink-0 border-t border-hairline p-5">
              <button type="button" onClick={join} disabled={joining} className="fl-submit" data-cursor="magnetic">
                {joining ? <Loader2 size={15} className="animate-spin" aria-hidden /> : null}
                {t('cta')}
                {!joining && <ArrowRight size={15} className="rtl:rotate-180" aria-hidden />}
              </button>
              <button
                type="button"
                onClick={() => setView('promo')}
                className="mx-auto mt-3 flex items-center gap-1.5 text-xs font-medium text-ink-muted transition-colors hover:text-navy"
              >
                <ArrowLeft size={13} className="rtl:rotate-180" aria-hidden />
                {t('back')}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
