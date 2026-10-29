/**
 * SignInPanel — /get-started/signin (page 4).
 *
 * A clean "Welcome!" screen reached from the Submit button on the details
 * step. The visitor has written their request; here they identify
 * themselves so we can tie it to a real person and follow up.
 *
 * Two entry points, matching the reference design:
 *   - "Continue with Google"  → next-auth Google provider
 *   - "Continue with email"   → reveals the email/password form
 *
 * On success (either method) the visitor lands on /get-started/confirm,
 * the request-received confirmation page.
 *
 * Google is wired in src/lib/auth.ts but only functions once
 * GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET are set in the environment; the
 * button always renders. The request typed on the previous step is stashed
 * in sessionStorage ('fl.getStarted.request') so it survives the OAuth
 * round-trip and can be persisted after authentication.
 */
'use client';

import { Suspense, useEffect, useState } from 'react';
import Image from 'next/image';
import { getProviders, signIn } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { Link, useRouter } from '@/i18n/routing';
import { ArrowLeft, Loader2, Mail } from 'lucide-react';

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1Z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09a6.6 6.6 0 0 1-.34-2.09c0-.73.13-1.43.34-2.09V7.07H2.18a11 11 0 0 0 0 9.86l3.66-2.84Z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.07l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38Z"
      />
    </svg>
  );
}

function SignInInner() {
  const t = useTranslations('getStarted');
  const locale = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const pillar = searchParams.get('pillar') ?? undefined;

  const [view, setView] = useState<'choice' | 'email'>('choice');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  // null = still checking; true/false = whether Google OAuth is configured.
  const [googleEnabled, setGoogleEnabled] = useState<boolean | null>(null);

  // next-auth's signIn isn't locale-aware, so build the return path by hand.
  // Every page is locale-prefixed (/en/..., /ar/...).
  const confirmPath = `/${locale}/get-started/confirm`;

  // Is the Google provider actually registered? It only is when the OAuth
  // secrets are set in the environment. We check so the button can fail
  // gracefully (with a message) instead of bouncing to the admin login page
  // when Google isn't configured yet.
  useEffect(() => {
    let active = true;
    getProviders()
      .then((providers) => {
        if (active) setGoogleEnabled(!!providers?.google);
      })
      .catch(() => {
        if (active) setGoogleEnabled(false);
      });
    return () => {
      active = false;
    };
  }, []);

  // NextAuth redirects a cancelled/failed OAuth attempt back here with
  // ?error=<code>. Translate the common codes into one friendly message.
  useEffect(() => {
    const code = searchParams.get('error');
    if (!code) return;
    setError(code === 'AccessDenied' ? t('signin.cancelled') : t('signin.googleError'));
  }, [searchParams, t]);

  function handleGoogle() {
    setError('');
    if (googleEnabled === false) {
      setError(t('signin.googleUnavailable'));
      return;
    }
    setGoogleLoading(true);
    // Full-page redirect to Google's account chooser; returns to confirmPath
    // on success or back here with ?error on cancel/failure.
    signIn('google', { callbackUrl: confirmPath });
  }

  async function handleEmail(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Get-started is mostly new visitors, so create the account first. Whatever
    // register says, then try signing in: that covers new accounts, existing
    // ones ("already registered"), and older accounts whose password is shorter
    // than today's minimum, which register rejects before checking the email.
    let registerError = '';
    try {
      const reg = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName,
          lastName,
          email,
          password,
          confirmPassword: password,
        }),
      });
      if (!reg.ok) {
        const data = await reg.json().catch(() => ({}));
        registerError = data?.error ?? '';
      }
    } catch {
      setError(t('form.submitError'));
      setLoading(false);
      return;
    }

    const res = await signIn('credentials', { email, password, redirect: false });
    if (res && !res.error) {
      router.push('/get-started/confirm');
      return;
    }
    // Sign-in failed. For an existing account the password was wrong; otherwise
    // show why the account couldn't be created.
    setError(
      registerError && !/already registered/i.test(registerError)
        ? registerError
        : t('signin.invalid'),
    );
    setLoading(false);
  }

  const backToRequest = pillar
    ? `/get-started/details?pillar=${pillar}`
    : '/get-started/details';

  return (
    <main className="fl-light relative flex min-h-screen flex-col items-center justify-center bg-canvas px-6 py-20 text-ink">
      {/* Unobtrusive way back to the request step — the reference is clean, but
          we keep navigation so nobody gets stranded here. */}
      <Link
        href={backToRequest}
        className="absolute start-5 top-5 inline-flex items-center gap-1.5 font-display text-sm font-medium text-ink-muted transition-colors hover:text-navy"
        data-cursor="hover"
      >
        <ArrowLeft size={16} className="rtl:rotate-180" />
        {t('back')}
      </Link>

      <div className="w-full max-w-[420px]">
        {view === 'choice' ? (
          <>
            {/* Brand lockup above the copy, matching /login and the pattern
                every large product uses on its sign-in screen. dir="ltr" keeps
                the Latin wordmark in order on the Arabic layout. */}
            <div dir="ltr" className="mb-8 flex items-center justify-center gap-3">
              <Image
                src="/images/logo-mark.png"
                alt=""
                width={40}
                height={40}
                className="h-10 w-10"
                priority
              />
              <span className="font-display text-2xl font-bold tracking-tight">
                <span className="text-navy">Future</span>
                <span className="text-teal-ink">Line</span>
              </span>
            </div>

            <h1 className="text-center font-display text-4xl font-bold leading-[1.1] tracking-tight text-navy">
              {t('welcome.title')}
            </h1>
            <p className="mx-auto mb-10 mt-4 max-w-[340px] text-center text-sm leading-relaxed text-ink-muted">
              {t('welcome.lede')}
            </p>

            {error && (
              <div className="mb-4 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-center text-sm text-red-600">
                {error}
              </div>
            )}

            <div className="space-y-3">
              <button
                type="button"
                onClick={handleGoogle}
                disabled={googleLoading}
                className="flex w-full items-center justify-center gap-3 rounded-lg border border-hairline bg-canvas-card px-5 py-3.5 text-sm font-medium text-ink transition-colors hover:border-teal/50 hover:bg-canvas-alt disabled:cursor-not-allowed disabled:opacity-60"
                data-cursor="magnetic"
              >
                {googleLoading ? (
                  <Loader2 size={18} className="animate-spin text-ink-muted" />
                ) : (
                  <GoogleIcon />
                )}
                {googleLoading ? t('signin.redirecting') : t('welcome.google')}
              </button>

              <button
                type="button"
                onClick={() => {
                  setError('');
                  setView('email');
                }}
                disabled={googleLoading}
                className="flex w-full items-center justify-center gap-3 rounded-lg border border-hairline bg-canvas-card px-5 py-3.5 text-sm font-medium text-ink transition-colors hover:border-teal/50 hover:bg-canvas-alt disabled:cursor-not-allowed disabled:opacity-60"
                data-cursor="magnetic"
              >
                <Mail size={18} className="text-ink-muted" />
                {t('welcome.email')}
              </button>
            </div>

            <p className="mx-auto mt-8 max-w-[300px] text-center text-xs leading-relaxed text-ink-muted">
              {t('welcome.termsPrefix')}{' '}
              <Link
                href="/terms"
                className="text-ink-muted underline decoration-hairline underline-offset-2 transition-colors hover:text-teal-ink"
              >
                {t('welcome.serviceTerms')}
              </Link>{' '}
              ·{' '}
              <Link
                href="/privacy"
                className="text-ink-muted underline decoration-hairline underline-offset-2 transition-colors hover:text-teal-ink"
              >
                {t('welcome.privacy')}
              </Link>
            </p>
          </>
        ) : (
          <>
            <h1 className="mb-2 text-center font-display text-3xl font-bold tracking-tight text-navy">
              {t('welcome.title')}
            </h1>
            <p className="mb-8 text-center text-sm text-ink-muted">{t('signin.lede')}</p>

            <form onSubmit={handleEmail} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="fl-label" htmlFor="gs-firstName">
                    {t('signin.firstName')}
                  </label>
                  <input
                    id="gs-firstName"
                    type="text"
                    required
                    autoFocus
                    autoComplete="given-name"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="fl-input"
                  />
                </div>
                <div>
                  <label className="fl-label" htmlFor="gs-lastName">
                    {t('signin.lastName')}
                  </label>
                  <input
                    id="gs-lastName"
                    type="text"
                    required
                    autoComplete="family-name"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="fl-input"
                  />
                </div>
              </div>
              <div>
                <label className="fl-label" htmlFor="gs-email">
                  {t('signin.email')}
                </label>
                <input
                  id="gs-email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="fl-input"
                  placeholder="you@company.com"
                />
              </div>
              <div>
                <label className="fl-label" htmlFor="gs-password">
                  {t('signin.password')}
                </label>
                <input
                  id="gs-password"
                  type="password"
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="fl-input"
                  placeholder="••••••••"
                />
              </div>

              {error && (
                <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-600">
                  {error}
                </div>
              )}

              <button type="submit" disabled={loading} className="fl-submit" data-cursor="magnetic">
                {loading ? t('signin.submitting') : t('signin.continue')}
              </button>
            </form>

            <button
              type="button"
              onClick={() => {
                setError('');
                setView('choice');
              }}
              className="mx-auto mt-6 flex items-center gap-1.5 font-display text-sm font-medium text-ink-muted transition-colors hover:text-navy"
              data-cursor="hover"
            >
              <ArrowLeft size={15} className="rtl:rotate-180" />
              {t('welcome.otherWays')}
            </button>
          </>
        )}
      </div>
    </main>
  );
}

export function SignInPanel() {
  return (
    <Suspense fallback={null}>
      <SignInInner />
    </Suspense>
  );
}
