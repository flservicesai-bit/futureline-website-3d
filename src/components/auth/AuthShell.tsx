/**
 * AuthShell — the shared frame for every auth screen.
 *
 * Sign in, register, forgot-password and reset-password were each carrying
 * their own hand-rolled markup, so they drifted apart visually. This owns the
 * brand furniture — ambient blooms, the logo lockup, eyebrow, heading and the
 * card — and leaves each page to supply only its form.
 *
 * The lockup is dir="ltr" so the Latin wordmark keeps its order in Arabic.
 */
import type { ReactNode } from 'react';
import Image from 'next/image';
import { Link } from '@/i18n/routing';
import { useTranslations } from 'next-intl';

export function AuthShell({
  eyebrow,
  title,
  subtitle,
  children,
  footer,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const a = useTranslations('a11y');
  return (
    <main className="fl-light relative flex min-h-screen items-center justify-center overflow-hidden bg-canvas px-6 py-16 text-ink">
      {/* Same ambient treatment the public pages use, so the canvas doesn't
          read as flat white. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -left-40 -top-40 h-[28rem] w-[28rem] rounded-full opacity-60 blur-3xl"
        style={{
          background: 'radial-gradient(circle, rgba(24,169,153,0.16) 0%, rgba(24,169,153,0) 70%)',
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-40 -right-40 h-[26rem] w-[26rem] rounded-full opacity-60 blur-3xl"
        style={{
          background: 'radial-gradient(circle, rgba(27,44,99,0.14) 0%, rgba(27,44,99,0) 70%)',
        }}
      />

      <div className="relative w-full max-w-[440px]">
        <Link
          href="/"
          dir="ltr"
          className="mx-auto mb-8 flex items-center justify-center gap-3"
          aria-label={a('home')}
          data-cursor="hover"
        >
          <Image
            src="/brand/futureline-mark.svg"
            alt=""
            width={45}
            height={44}
            className="h-11 w-auto"
            priority
          />
          <span className="font-display text-3xl font-bold tracking-tight">
            <span className="text-navy">Future</span>
            <span className="text-teal-ink">Line</span>
          </span>
        </Link>

        <div className="rounded-card border border-hairline bg-canvas-card p-8 fl-elev-2">
          <p className="mb-3 text-center font-display text-[11px] font-semibold uppercase tracking-[0.3em] text-teal-ink">
            {eyebrow}
          </p>
          <h1 className="text-center font-display text-3xl font-bold leading-[1.15] tracking-tight text-navy">
            {title}
          </h1>
          {subtitle && (
            <p className="mx-auto mt-3 mb-8 max-w-[320px] text-center text-sm leading-relaxed text-ink-muted">
              {subtitle}
            </p>
          )}
          <div className={subtitle ? '' : 'mt-8'}>{children}</div>
        </div>

        {footer && <div className="mt-6 text-center text-sm text-ink-muted">{footer}</div>}
      </div>
    </main>
  );
}
