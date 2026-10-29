/**
 * WaitlistRecorder — the far end of the promo's "Join the waitlist" button.
 *
 * The promo dialog sends people through Google sign-in and back to the course
 * page with ?waitlist=<slug>. This picks that up, records the signed-in person
 * against the course, and confirms it on screen — so the button means what it
 * says instead of just being a sign-in link.
 *
 * The query parameter is stripped straight away so a reload, a share or a
 * back-button doesn't re-post it; the API is idempotent per person per course
 * regardless.
 *
 * Renders nothing at all when there is no waitlist parameter, which is every
 * ordinary visit to the page.
 */
'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import { Check, Loader2, X } from 'lucide-react';

type State = 'idle' | 'saving' | 'done' | 'error';

function Recorder({ slug }: { slug: string }) {
  const t = useTranslations('promo');
  const params = useSearchParams();
  const { data: session, status } = useSession();
  const [state, setState] = useState<State>('idle');
  const [dismissed, setDismissed] = useState(false);
  const [requested, setRequested] = useState(false);
  const posted = useRef(false);

  // Latch the request, then drop the parameter. Latching matters: the session
  // usually resolves a tick after mount, and by then the parameter is gone —
  // reading it live would lose the signal before we could act on it.
  //
  // replaceState rather than router.replace: no re-render, no scroll jump, no
  // server round-trip.
  useEffect(() => {
    if (params.get('waitlist') !== slug) return;
    setRequested(true);
    const url = new URL(window.location.href);
    url.searchParams.delete('waitlist');
    window.history.replaceState(null, '', url.pathname + url.search + url.hash);
  }, [params, slug]);

  useEffect(() => {
    if (!requested || posted.current) return;
    if (status === 'loading') return;
    // Signed out means they abandoned the Google screen — nothing to record,
    // and no point shouting about it.
    if (status !== 'authenticated' || !session?.user?.email) return;

    posted.current = true;
    setState('saving');
    fetch('/api/waitlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ course: slug }),
    })
      .then((res) => setState(res.ok ? 'done' : 'error'))
      .catch(() => setState('error'));
  }, [requested, status, session, slug]);

  if (!requested || state === 'idle' || dismissed) return null;

  const isError = state === 'error';

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-4 bottom-4 z-[80] mx-auto max-w-[440px] rounded-card border border-hairline bg-canvas-card p-5 fl-elev-3 motion-safe:animate-[promoIn_.35s_cubic-bezier(.16,1,.3,1)] sm:inset-x-auto sm:end-6"
    >
      <button
        type="button"
        onClick={() => setDismissed(true)}
        aria-label={t('close')}
        className="absolute end-3 top-3 flex h-7 w-7 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-canvas-alt hover:text-navy"
      >
        <X size={14} aria-hidden />
      </button>

      <div className="flex gap-3 pe-6">
        <span className="mt-0.5 shrink-0">
          {state === 'saving' ? (
            <Loader2 size={18} className="animate-spin text-ink-muted" aria-hidden />
          ) : (
            <Check size={18} className={isError ? 'text-red-500' : 'text-teal-ink'} aria-hidden />
          )}
        </span>
        <div>
          <p className="font-display text-sm font-semibold text-navy">
            {state === 'saving'
              ? t('joiningTitle')
              : isError
                ? t('joinErrorTitle')
                : t('joinedTitle')}
          </p>
          {state !== 'saving' && (
            <p className="mt-1 text-sm leading-relaxed text-ink-muted">
              {isError ? t('joinErrorBody') : t('joinedBody')}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export function WaitlistRecorder({ slug }: { slug: string }) {
  // useSearchParams needs a Suspense boundary in an app-router page.
  return (
    <Suspense fallback={null}>
      <Recorder slug={slug} />
    </Suspense>
  );
}
