'use client';
import { useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { Link } from '@/i18n/routing';
import { GoogleSignInButton } from '@/components/auth/GoogleSignInButton';
import { PasswordInput } from '@/components/auth/PasswordInput';
import { AuthShell } from '@/components/auth/AuthShell';
import { useLocale, useTranslations } from 'next-intl';

import { signIn } from 'next-auth/react';
import { PASSWORD_MIN_LENGTH } from '@/lib/password';
import { safeCallbackPath } from '@/lib/utils';

function RegisterForm() {
  const t = useTranslations('auth');
  const locale = useLocale();
  // Where to land after signing up: the page that sent them here (an enrol
  // button, a gated page), else the dashboard.
  const callbackUrl = safeCallbackPath(useSearchParams().get('callbackUrl'));
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      setError(t('register.errorMismatch'));
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firstName, lastName, email, password, confirmPassword }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || t('register.errorFailed'));
        setLoading(false);
        return;
      }

      await signIn('credentials', { email, password, redirect: false });
      window.location.href = callbackUrl ?? `/${locale}/dashboard`;
    } catch {
      setError(t('register.errorGeneric'));
      setLoading(false);
    }
  };

  return (
    <AuthShell
      eyebrow={t('register.eyebrow')}
      title={t('register.title')}
      subtitle={t('register.subtitle')}
      footer={
        <>
          {t('register.haveAccount')}{' '}
          <Link
            href={{ pathname: '/login', query: callbackUrl ? { callbackUrl } : {} }}
            className="font-semibold text-teal transition-colors hover:text-teal-dark"
          >
            {t('register.signIn')}
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

      <GoogleSignInButton callbackUrl={callbackUrl ?? `/${locale}/dashboard`} />

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="fl-label" htmlFor="reg-first">
              {t('register.firstNameLabel')}
            </label>
            <input
              id="reg-first"
              type="text"
              autoComplete="given-name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="fl-input"
              required
            />
          </div>
          <div>
            <label className="fl-label" htmlFor="reg-last">
              {t('register.lastNameLabel')}
            </label>
            <input
              id="reg-last"
              type="text"
              autoComplete="family-name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="fl-input"
              required
            />
          </div>
        </div>

        <div>
          <label className="fl-label" htmlFor="reg-email">
            {t('register.emailLabel')}
          </label>
          <input
            id="reg-email"
            type="email"
            autoComplete="email"
            placeholder="you@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="fl-input"
            required
          />
        </div>

        <PasswordInput
          id="reg-password"
          label={t('register.passwordLabel')}
          value={password}
          onChange={setPassword}
          autoComplete="new-password"
          minLength={PASSWORD_MIN_LENGTH}
          showLabelText={t('login.showPassword')}
          hideLabelText={t('login.hidePassword')}
        />

        <PasswordInput
          id="reg-confirm"
          label={t('register.confirmPasswordLabel')}
          value={confirmPassword}
          onChange={setConfirmPassword}
          autoComplete="new-password"
          minLength={PASSWORD_MIN_LENGTH}
          showLabelText={t('login.showPassword')}
          hideLabelText={t('login.hidePassword')}
        />

        <button type="submit" disabled={loading} className="fl-submit" data-cursor="magnetic">
          {loading ? t('register.submitting') : t('register.submit')}
        </button>
      </form>
    </AuthShell>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={null}>
      <RegisterForm />
    </Suspense>
  );
}
