'use client';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { KeyRound } from 'lucide-react';
import { PASSWORD_MIN_LENGTH } from '@/lib/password';

export default function ChangePasswordForm() {
  const t = useTranslations('changePassword');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });

    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: t('passwordsDoNotMatch') });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await res.json();
      if (!res.ok) {
        setMessage({ type: 'error', text: data.error || t('failedToUpdate') });
      } else {
        setMessage({ type: 'success', text: t('updatedSuccessfully') });
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch {
      setMessage({ type: 'error', text: t('somethingWentWrong') });
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    'w-full px-4 py-3 bg-canvas-card border border-hairline rounded-lg text-navy placeholder:text-ink-muted focus:outline-none focus:ring-1 focus:ring-teal-500/20 focus:border-teal-500/50 transition-colors text-sm';

  return (
    <div className="rounded-xl border border-hairline bg-canvas-card backdrop-blur-sm p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-9 h-9 bg-teal-500/10 border border-teal-500/20 rounded-lg flex items-center justify-center">
          <KeyRound size={16} className="text-teal-400" />
        </div>
        <h3 className="text-base font-black text-navy tracking-tight">{t('title')}</h3>
      </div>

      {message.text && (
        <div className={`mb-4 px-4 py-3 rounded-lg text-xs font-medium border ${
          message.type === 'success'
            ? 'bg-teal-500/10 border-teal-500/20 text-teal-300'
            : 'bg-red-500/10 border-red-500/20 text-red-400'
        }`}>
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-ink-muted uppercase tracking-widest mb-2">{t('currentPassword')}</label>
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className={inputClass}
            required
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-ink-muted uppercase tracking-widest mb-2">{t('newPassword')}</label>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className={inputClass}
            required
            minLength={PASSWORD_MIN_LENGTH}
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-ink-muted uppercase tracking-widest mb-2">{t('confirmPassword')}</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className={inputClass}
            required
            minLength={PASSWORD_MIN_LENGTH}
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 rounded-lg bg-gradient-to-r from-teal-500 to-blue-600 text-navy text-sm font-bold hover:opacity-90 transition-opacity disabled:opacity-50 uppercase tracking-widest"
        >
          {loading ? t('updating') : t('update')}
        </button>
      </form>
    </div>
  );
}
