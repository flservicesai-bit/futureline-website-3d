'use client';

import { useEffect } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { AlertTriangle, RotateCcw, Home } from 'lucide-react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations('errorPage');
  const locale = useLocale();

  useEffect(() => {
    console.error('Application error:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-canvas flex items-center justify-center px-4 relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] bg-red-600/[0.04] rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute -top-32 -end-32 w-80 h-80 bg-[#1466de]/[0.04] rounded-full blur-3xl pointer-events-none" />

      <div className="relative text-center max-w-md w-full">
        <div className="w-16 h-16 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <AlertTriangle className="text-red-400" size={28} />
        </div>

        <h1 className="text-2xl font-black text-navy tracking-tight mb-3">{t('title')}</h1>
        <p className="text-ink-muted text-sm leading-relaxed mb-10">
          {t('body')}
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => reset()}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-navy text-white text-sm font-bold hover:bg-navy-light transition-colors uppercase tracking-widest"
          >
            <RotateCcw size={15} />
            {t('retry')}
          </button>
          <a
            href={`/${locale}`}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg border border-hairline text-navy text-sm font-bold hover:bg-canvas-card transition-colors uppercase tracking-widest"
          >
            <Home size={15} />
            {t('home')}
          </a>
        </div>

        {error.digest && (
          <p className="mt-8 text-[10px] text-slate-700 font-mono">{t('errorId')}: {error.digest}</p>
        )}
      </div>
    </div>
  );
}
