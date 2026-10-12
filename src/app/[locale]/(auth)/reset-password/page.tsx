'use client';
import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Link } from '@/i18n/routing';
import { AuthShell } from '@/components/auth/AuthShell';
import { useTranslations } from 'next-intl';
import { PasswordInput } from '@/components/auth/PasswordInput';
import { PASSWORD_MIN_LENGTH } from '@/lib/password';

function ResetPasswordForm() {
  const t = useTranslations('auth');
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  if (!token) {
    return (
      <div className="w-full max-w-md rounded-2xl border border-hairline bg-canvas-card backdrop-blur-xl p-8">
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-lg mb-6 text-sm">
          {t('reset.invalidLink')}
        </div>
        <p className="text-center text-sm text-ink-muted">
          <Link href="/forgot-password" className="text-teal-400 hover:text-teal-300 font-semibold">
            {t('reset.requestNew')}
          </Link>
        </p>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < PASSWORD_MIN_LENGTH) {
      setError(t('reset.errorTooShort'));
      return;
    }

    if (password !== confirmPassword) {
      setError(t('reset.errorMismatch'));
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || t('reset.errorFailed'));
        setLoading(false);
        return;
      }

      setSuccess(true);
    } catch {
      setError(t('reset.errorGeneric'));
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div>
        <div className="mb-6 rounded-lg border border-teal/25 bg-teal/[0.08] px-4 py-3 text-sm text-teal-dark">
          {t('reset.successMessage')}
        </div>
        <Link href="/login" className="fl-submit" data-cursor="magnetic">
          {t('reset.signIn')}
        </Link>
      </div>
    );
  }

  return (
    <div>
      {error && (
        <div role="alert" className="mb-6 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <PasswordInput
          id="reset-new-password"
          label={t('reset.newPasswordLabel')}
          value={password}
          onChange={setPassword}
          autoComplete="new-password"
          placeholder={t('reset.newPasswordPlaceholder')}
          minLength={PASSWORD_MIN_LENGTH}
          showLabelText={t('login.showPassword')}
          hideLabelText={t('login.hidePassword')}
        />
        <PasswordInput
          id="reset-confirm-password"
          label={t('reset.confirmPasswordLabel')}
          value={confirmPassword}
          onChange={setConfirmPassword}
          autoComplete="new-password"
          placeholder={t('reset.confirmPasswordPlaceholder')}
          minLength={PASSWORD_MIN_LENGTH}
          showLabelText={t('login.showPassword')}
          hideLabelText={t('login.hidePassword')}
        />
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-gradient-to-r from-teal-500 to-blue-600 text-navy text-sm font-bold py-3 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {loading ? t('reset.submitting') : t('reset.submit')}
        </button>
      </form>

      <p className="text-center text-sm text-ink-muted mt-6">
        <Link href="/login" className="font-semibold text-teal transition-colors hover:text-teal-dark">
          {t('reset.backToSignIn')}
        </Link>
      </p>
    </div>
  );
}

export default function ResetPasswordPage() {
  const t = useTranslations('auth');
  return (
    <AuthShell
      eyebrow={t('reset.eyebrow')}
      title={t('reset.title')}
      subtitle={t('reset.subtitle')}
    >
      <Suspense fallback={<p className="text-center text-sm text-ink-muted">{t('reset.loading')}</p>}>
        <ResetPasswordForm />
      </Suspense>
    </AuthShell>
  );
}
