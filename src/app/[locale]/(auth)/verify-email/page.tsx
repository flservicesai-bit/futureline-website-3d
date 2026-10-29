'use client';
import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Link } from '@/i18n/routing';
import { AuthShell } from '@/components/auth/AuthShell';
import { useTranslations } from 'next-intl';

/**
 * Confirm-your-email page, opened from the link in the welcome email.
 * Confirming takes a click rather than happening on load: mail scanners
 * open links, and must not confirm an address its owner never saw.
 */
function VerifyEmail() {
  const t = useTranslations('auth');
  const token = useSearchParams().get('token') ?? '';
  const [state, setState] = useState<'idle' | 'working' | 'done' | 'invalid'>(
    token ? 'idle' : 'invalid',
  );

  const confirm = async () => {
    setState('working');
    try {
      const res = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      setState(res.ok ? 'done' : 'invalid');
    } catch {
      setState('invalid');
    }
  };

  const title =
    state === 'done' ? t('verify.doneTitle') : state === 'invalid' ? t('verify.invalidTitle') : t('verify.title');
  const subtitle =
    state === 'done' ? t('verify.doneBody') : state === 'invalid' ? t('verify.invalidBody') : t('verify.subtitle');

  return (
    <AuthShell eyebrow={t('verify.eyebrow')} title={title} subtitle={subtitle}>
      {state === 'done' ? (
        <Link href="/dashboard" className="fl-submit">
          {t('verify.continue')}
        </Link>
      ) : state === 'invalid' ? (
        <Link href="/login" className="fl-submit">
          {t('verify.signIn')}
        </Link>
      ) : (
        <button type="button" onClick={confirm} disabled={state === 'working'} className="fl-submit">
          {state === 'working' ? t('verify.confirming') : t('verify.confirm')}
        </button>
      )}
    </AuthShell>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={null}>
      <VerifyEmail />
    </Suspense>
  );
}
