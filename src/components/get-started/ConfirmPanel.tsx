/**
 * ConfirmPanel — /get-started/confirm (final step).
 *
 * This is where the visitor lands after signing in (Google or email) at
 * /get-started/signin. The request they typed on the details step was stashed
 * in sessionStorage to survive the sign-in hop; here, with an authenticated
 * identity, it is saved as a lead (POST /api/leads).
 *
 * "Request received" is shown only once that save succeeds. Before, the page
 * claimed success even when nothing was saved (opened directly, rate-limited,
 * or a rejected name), and the request was lost. Now a failed save keeps the
 * stash and offers a retry, and a visit with nothing to send says so.
 */
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import { AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Link, useRouter } from '@/i18n/routing';

const STASH_KEY = 'fl.getStarted.request';
// leadSchema caps first and last names at 50 characters.
const NAME_MAX = 50;

type Stash = { pillar?: string; message?: string };
type Phase = 'saving' | 'saved' | 'error' | 'nothing';

function readStash(): Stash | null {
  try {
    const raw = sessionStorage.getItem(STASH_KEY);
    return raw ? (JSON.parse(raw) as Stash) : null;
  } catch {
    return null; // sessionStorage unavailable or corrupt
  }
}

export function ConfirmPanel() {
  const t = useTranslations('getStarted');
  const router = useRouter();
  const { data: session, status } = useSession();
  const [phase, setPhase] = useState<Phase>('saving');
  const started = useRef(false);

  const save = useCallback(
    async (request: Stash) => {
      setPhase('saving');
      const user = session?.user as
        | { firstName?: string; lastName?: string; name?: string; email?: string }
        | undefined;
      const nameParts = (user?.name ?? '').trim().split(/\s+/).filter(Boolean);
      try {
        const res = await fetch('/api/leads', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            firstName: (user?.firstName || nameParts[0] || 'Customer').slice(0, NAME_MAX),
            lastName: (user?.lastName || nameParts.slice(1).join(' ') || '—').slice(0, NAME_MAX),
            email: user?.email,
            message: request.message?.trim() || 'Get Started request',
            tourType: request.pillar || 'General Enquiry',
            source: 'Get Started',
          }),
        });
        if (!res.ok) throw new Error(`Lead not saved: ${res.status}`);
        try {
          sessionStorage.removeItem(STASH_KEY);
        } catch {
          /* ignore */
        }
        setPhase('saved');
      } catch {
        // Keep the stash so "Try again" can resend it.
        setPhase('error');
      }
    },
    [session],
  );

  useEffect(() => {
    // Wait for the session, and send once (effects can re-run).
    if (status === 'loading' || started.current) return;
    started.current = true;

    const request = readStash();
    if (!request) {
      setPhase('nothing');
      return;
    }
    if (status !== 'authenticated' || !session?.user?.email) {
      // A lead needs a real contact: send them to sign in, request intact.
      router.replace({
        pathname: '/get-started/signin',
        query: request.pillar ? { pillar: request.pillar } : {},
      });
      return;
    }
    save(request);
  }, [status, session, router, save]);

  const retry = () => {
    const request = readStash();
    if (request) save(request);
    else setPhase('nothing');
  };

  const linkClass =
    'font-mono text-[11px] uppercase tracking-[0.3em] text-teal transition-colors hover:text-teal-dark';

  return (
    <main className="fl-light relative flex min-h-screen flex-col items-center justify-center bg-canvas px-6 py-20 text-ink">
      <div
        role="status"
        aria-live="polite"
        className="w-full max-w-md rounded-card border border-teal/25 bg-teal/[0.06] p-10 text-center"
      >
        {phase === 'saving' && (
          <>
            <Loader2 size={28} className="mx-auto mb-6 animate-spin text-teal" aria-hidden />
            <p className="text-sm text-ink-muted">{t('done.saving')}</p>
          </>
        )}

        {phase === 'saved' && (
          <>
            <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-full border border-teal/30 bg-teal/10">
              <CheckCircle size={28} className="text-teal" aria-hidden />
            </div>
            <h1 className="mb-3 font-display text-3xl font-bold tracking-tight text-navy">
              {t('done.title')}
            </h1>
            <p className="mx-auto mb-8 max-w-sm text-sm leading-relaxed text-ink-muted">
              {t('done.body')}
            </p>
            <Link href="/" className={linkClass} data-cursor="hover">
              {t('done.backHome')}
            </Link>
          </>
        )}

        {phase === 'error' && (
          <>
            <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-full border border-red-200 bg-red-50">
              <AlertCircle size={28} className="text-red-600" aria-hidden />
            </div>
            <h1 className="mb-3 font-display text-2xl font-bold tracking-tight text-navy">
              {t('done.errorTitle')}
            </h1>
            <p className="mx-auto mb-8 max-w-sm text-sm leading-relaxed text-ink-muted">
              {t('done.errorBody')}
            </p>
            <button type="button" onClick={retry} className="fl-submit !w-auto px-8" data-cursor="magnetic">
              {t('done.retry')}
            </button>
          </>
        )}

        {phase === 'nothing' && (
          <>
            <h1 className="mb-3 font-display text-2xl font-bold tracking-tight text-navy">
              {t('done.nothingTitle')}
            </h1>
            <p className="mx-auto mb-8 max-w-sm text-sm leading-relaxed text-ink-muted">
              {t('done.nothingBody')}
            </p>
            <Link href="/get-started" className="fl-submit !w-auto px-8" data-cursor="magnetic">
              {t('done.startRequest')}
            </Link>
          </>
        )}
      </div>
    </main>
  );
}
