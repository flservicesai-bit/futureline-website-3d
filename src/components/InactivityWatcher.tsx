'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import { AlertCircle, Clock, LogOut } from 'lucide-react';

interface InactivityWatcherProps {
  timeoutMinutes: number;
}

export default function InactivityWatcher({ timeoutMinutes }: InactivityWatcherProps) {
  const { data: session, status } = useSession();
  const t = useTranslations('inactivity');
  const [showWarning, setShowWarning] = useState(false);
  const [countdown, setCountdown] = useState(120); // 2 minute warning
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);

  const logout = useCallback(() => {
    signOut({ callbackUrl: '/login?reason=inactivity' });
  }, []);

  const resetTimer = useCallback(() => {
    if (showWarning) return; // Don't reset if warning is already showing
    
    if (timerRef.current) clearTimeout(timerRef.current);
    
    // Set timer for (timeout - 2) minutes to show warning
    const warningTime = (timeoutMinutes * 60 - 120) * 1000;
    timerRef.current = setTimeout(() => {
      setShowWarning(true);
    }, Math.max(0, warningTime));
  }, [timeoutMinutes, showWarning]);

  const stayLoggedIn = () => {
    setShowWarning(false);
    setCountdown(120);
    resetTimer();
  };

  useEffect(() => {
    if (status !== 'authenticated') return;

    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll'];
    events.forEach(event => window.addEventListener(event, resetTimer));
    
    resetTimer();

    return () => {
      events.forEach(event => window.removeEventListener(event, resetTimer));
      if (timerRef.current) clearTimeout(timerRef.current);
      if (countdownRef.current) clearTimeout(countdownRef.current);
    };
  }, [status, resetTimer]);

  useEffect(() => {
    if (showWarning && countdown > 0) {
      countdownRef.current = setTimeout(() => {
        setCountdown(prev => prev - 1);
      }, 1000);
    } else if (showWarning && countdown === 0) {
      logout();
    }
    
    return () => {
      if (countdownRef.current) clearTimeout(countdownRef.current);
    };
  }, [showWarning, countdown, logout]);

  if (!showWarning) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-white/[0.1] rounded-2xl shadow-2xl shadow-black/50 max-w-md w-full overflow-hidden animate-in fade-in zoom-in duration-300">
        <div className="bg-orange-500 p-6 text-white flex items-center gap-4">
          <div className="bg-white/20 p-3 rounded-xl">
            <Clock className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-xl font-bold">{t('title')}</h3>
            <p className="text-orange-100 text-sm">{t('subtitle')}</p>
          </div>
        </div>

        <div className="p-8 text-center">
          <div className="mb-6">
            <p className="text-slate-400 mb-2">{t('expiresIn')}</p>
            <div className="text-4xl font-black text-white tabular-nums">
              {Math.floor(countdown / 60)}:{(countdown % 60).toString().padStart(2, '0')}
            </div>
          </div>

          <div className="space-y-3">
            <button
              onClick={stayLoggedIn}
              className="w-full bg-gradient-to-r from-teal-500 to-blue-600 text-white font-bold py-3 px-6 rounded-xl transition-all hover:opacity-90"
            >
              {t('stay')}
            </button>
            <button
              onClick={() => logout()}
              className="w-full border border-white/[0.1] text-slate-400 hover:bg-white/[0.05] hover:text-slate-300 font-semibold py-3 px-6 rounded-xl transition-all"
            >
              {t('signOut')}
            </button>
          </div>
        </div>

        <div className="bg-white/[0.02] px-8 py-4 border-t border-white/[0.06] flex items-center gap-3">
          <AlertCircle size={16} className="text-slate-500" />
          <p className="text-xs text-slate-500">
            {t('note')}
          </p>
        </div>
      </div>
    </div>
  );
}
