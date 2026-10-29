/**
 * GetStartedShell — shared header + 4-step navigation for the journey.
 *
 * The 4 steps span 4 REAL separate routes (not step state on one page):
 *   1. /                       — the home page hero (untouched)
 *   2. /get-started            — pick an option
 *   3. /get-started/details    — write your request + Submit
 *   4. /get-started/signin     — sign in (Google or email)
 *
 * The numbered circles are real navigation: any step you've already
 * passed is a clickable <Link> back to that page. The current step and
 * steps ahead of you are not links — you can't skip the option picker
 * and land on a details form with no pillar, and you can't jump to the
 * confirmation without submitting.
 *
 * The hero (step 1) doesn't render this shell — it keeps its own design
 * untouched by request — but it is still counted and shown here as a
 * completed step, so the navigation reads as 4 pages rather than 3.
 */
'use client';

import { Link } from '@/i18n/routing';
import { useTranslations } from 'next-intl';
import { Check } from 'lucide-react';

const STEPS = [
  { key: 'start', href: () => '/' },
  {
    key: 'pick',
    href: (pillar?: string) => (pillar ? `/get-started?pillar=${pillar}` : '/get-started'),
  },
  {
    key: 'details',
    href: (pillar?: string) =>
      pillar ? `/get-started/details?pillar=${pillar}` : '/get-started/details',
  },
  {
    key: 'signin',
    href: (pillar?: string) =>
      pillar ? `/get-started/signin?pillar=${pillar}` : '/get-started/signin',
  },
] as const;

export function GetStartedShell({
  step,
  pillar,
  children,
}: {
  /** Which of the 4 journey pages is active. 1 is the home hero. */
  step: 2 | 3 | 4;
  /** Carried through so back-links preserve the picked option. */
  pillar?: string;
  children: React.ReactNode;
}) {
  const t = useTranslations('getStarted');
  const a = useTranslations('a11y');

  return (
    <main className="fl-light relative min-h-screen bg-canvas px-4 py-16 text-ink sm:px-6 md:py-24 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <div className="mx-auto mb-10 max-w-2xl text-center">
          <p className="mb-3 font-display text-sm font-semibold uppercase tracking-[0.3em] text-teal-ink">
            {t('eyebrow')}
          </p>
          <h1 className="mb-4 font-display text-4xl font-bold tracking-tight text-navy md:text-5xl">
            {t('heading')}
          </h1>
          <p className="text-lg text-ink-muted">{t('lede')}</p>
        </div>

        <nav aria-label={a('progress')} className="mb-12">
          <ol className="flex flex-wrap items-center justify-center gap-2 sm:gap-4">
            {STEPS.map(({ key, href }, i) => {
              const n = i + 1;
              const active = n === step;
              const done = n < step;
              const label = t(`steps.${key}`);

              const circle = (
                <span
                  className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full font-mono text-xs font-semibold transition-colors ${
                    done
                      ? 'bg-teal text-white'
                      : active
                        ? 'border-2 border-teal text-teal-ink'
                        : 'border border-hairline text-ink-muted'
                  }`}
                >
                  {done ? <Check size={13} /> : n}
                </span>
              );

              const text = (
                <span
                  className={`hidden font-display text-sm font-medium sm:inline ${
                    active ? 'text-navy' : 'text-ink-muted'
                  }`}
                >
                  {label}
                </span>
              );

              return (
                <li key={key} className="flex items-center gap-2 sm:gap-4">
                  {done ? (
                    <Link
                      href={href(pillar)}
                      className="flex items-center gap-2 transition-opacity hover:opacity-70"
                      aria-label={`Back to step ${n}: ${label}`}
                      data-cursor="hover"
                    >
                      {circle}
                      {text}
                    </Link>
                  ) : (
                    <div
                      className="flex items-center gap-2"
                      aria-current={active ? 'step' : undefined}
                    >
                      {circle}
                      {text}
                    </div>
                  )}
                  {n < STEPS.length && (
                    <span aria-hidden className="h-px w-6 bg-hairline sm:w-10" />
                  )}
                </li>
              );
            })}
          </ol>
        </nav>

        {children}
      </div>
    </main>
  );
}
