'use client';
import { useState } from 'react';
import { Link } from '@/i18n/routing';
import { AuthShell } from '@/components/auth/AuthShell';
import { useTranslations } from 'next-intl';

export default function ForgotPasswordPage() {
  const t = useTranslations('auth');
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (res.status === 429) {
        setError(t('forgot.errorTooManyRequests'));
        setLoading(false);
        return;
      }

      setSubmitted(true);
    } catch {
      setError(t('forgot.errorGeneric'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      eyebrow={t('forgot.eyebrow')}
      title={t('forgot.title')}
      subtitle={submitted ? t('forgot.subtitleSent') : t('forgot.subtitleDefault')}
      footer={
        <>
          {t('forgot.rememberPassword')}{' '}
          <Link
            href="/login"
            className="font-semibold text-teal-ink transition-colors hover:text-navy"
          >
            {t('forgot.signIn')}
          </Link>
        </>
      }
    >
      {submitted ? (
        <div>
          <div className="mb-6 rounded-lg border border-teal/25 bg-teal/[0.08] px-4 py-3 text-sm text-teal-dark">
            {t('forgot.successMessage')}
          </div>
          <p className="mb-4 text-center text-sm text-ink-muted">{t('forgot.spamHint')}</p>
          <button
            type="button"
            onClick={() => {
              setSubmitted(false);
              setEmail('');
            }}
            className="mx-auto block text-sm font-semibold text-teal-ink transition-colors hover:text-navy"
          >
            {t('forgot.tryAnother')}
          </button>
        </div>
      ) : (
        <>
          {error && (
            <div
              role="alert"
              className="mb-6 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-600"
            >
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="fl-label" htmlFor="forgot-email">
                {t('forgot.emailLabel')}
              </label>
              <input
                id="forgot-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="fl-input"
                placeholder={t('forgot.emailPlaceholder')}
                required
              />
            </div>
            <button type="submit" disabled={loading} className="fl-submit" data-cursor="magnetic">
              {loading ? t('forgot.submitting') : t('forgot.submit')}
            </button>
          </form>
        </>
      )}
    </AuthShell>
  );
}
