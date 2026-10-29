'use client';
import { signIn } from 'next-auth/react';
import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Link } from '@/i18n/routing';
import { AuthShell } from '@/components/auth/AuthShell';
import { useLocale, useTranslations } from 'next-intl';
import { GoogleSignInButton } from '@/components/auth/GoogleSignInButton';
import { PasswordInput } from '@/components/auth/PasswordInput';
import { safeCallbackPath } from '@/lib/utils';

/**
 * Sign in.
 *
 * Uses the shared brand form primitives (.fl-label / .fl-input / .fl-submit)
 * and surface tokens rather than hand-rolled Tailwind, so it reads as part of
 * the light redesign instead of the generic form it used to be.
 *
 * Honours ?callbackUrl= so anything that sends someone here to sign in first
 * — the enrol button, a gated page — gets them back where they were
 * instead of dropping them on the dashboard.
 */
function LoginForm() {
  const t = useTranslations('auth');
  const locale = useLocale();
  const searchParams = useSearchParams();

  // Only same-site paths; anything else would make this an open redirect that
  // phishing links could point anywhere.
  const callbackUrl = safeCallbackPath(searchParams.get('callbackUrl'));

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const result = await signIn('credentials', {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      setError(t('login.errorInvalid'));
      setLoading(false);
    } else if (callbackUrl) {
      window.location.href = callbackUrl;
    } else {
      const sessionRes = await fetch('/api/auth/session');
      const session = await sessionRes.json();
      const role = session?.user?.role;
      // Keep the active locale: with localePrefix 'always' a bare '/admin'
      // redirects to the English route and drops an Arabic user's locale.
      if (role === 'ADMIN') {
        window.location.href = `/${locale}/admin`;
      } else if (role === 'INSTRUCTOR') {
        window.location.href = `/${locale}/instructor`;
      } else {
        window.location.href = `/${locale}/dashboard`;
      }
    }
  };

  return (
    <AuthShell
      eyebrow={t('login.eyebrow')}
      title={t('login.title')}
      subtitle={t('login.subtitle')}
      footer={
        <>
          {t('login.noAccount')}{' '}
          <Link
            href={{ pathname: '/register', query: callbackUrl ? { callbackUrl } : {} }}
            className="font-semibold text-teal-ink transition-colors hover:text-navy"
          >
            {t('login.createOne')}
          </Link>
        </>
      }
    >
      {error && (
        <div
          role="alert"
          className="mb-6 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-600"
        >
          {error}
        </div>
      )}

      {/* Google lands on /dashboard, which routes ADMIN → /admin and
          INSTRUCTOR → /instructor, mirroring the credentials flow below.
          signIn() isn't locale-aware, so the prefix is added by hand. */}
      <GoogleSignInButton callbackUrl={callbackUrl ?? `/${locale}/dashboard`} />

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="fl-label" htmlFor="login-email">
            {t('login.emailLabel')}
          </label>
          <input
            id="login-email"
            type="email"
            name="email"
            autoComplete="email"
            placeholder="you@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="fl-input"
            required
          />
        </div>

        <PasswordInput
          id="login-password"
          label={t('login.passwordLabel')}
          value={password}
          onChange={setPassword}
          autoComplete="current-password"
          showLabelText={t('login.showPassword')}
          hideLabelText={t('login.hidePassword')}
        />

        <button type="submit" disabled={loading} className="fl-submit" data-cursor="magnetic">
          {loading ? t('login.submitting') : t('login.submit')}
        </button>
      </form>

      <div className="mt-5 text-center">
        <Link
          href="/forgot-password"
          className="text-sm font-medium text-teal-ink transition-colors hover:text-navy"
        >
          {t('login.forgotPassword')}
        </Link>
      </div>
    </AuthShell>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
