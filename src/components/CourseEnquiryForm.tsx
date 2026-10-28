'use client';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Send, CheckCircle } from 'lucide-react';
import { Honeypot, HONEYPOT_FIELD, honeypotValue } from '@/components/Honeypot';

export default function CourseEnquiryForm() {
  const t = useTranslations('courseEnquiry');
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    tourType: '',
    message: '',
  });
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const trap = honeypotValue(e.currentTarget);
    setStatus('sending');
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, source: 'FL Courses', [HONEYPOT_FIELD]: trap }),
      });
      if (res.ok) {
        setStatus('sent');
        setForm({ firstName: '', lastName: '', email: '', tourType: '', message: '' });
      } else {
        setStatus('error');
      }
    } catch {
      setStatus('error');
    }
  };

  if (status === 'sent') {
    return (
      <div className="rounded-md border border-academy/30 bg-academy/[0.04] p-10 text-center">
        <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full border border-academy/30 bg-academy/10">
          <CheckCircle size={24} className="text-academy" />
        </div>
        <h3 className="mb-2 text-2xl font-semibold tracking-[-0.01em] text-navy">
          {t('successTitle')}
        </h3>
        <p className="mb-8 text-sm leading-relaxed text-ink-muted">
          {t('successBody')}
        </p>
        <button
          onClick={() => setStatus('idle')}
          className="font-mono text-[11px] uppercase tracking-[0.3em] text-academy transition-colors hover:text-academy-light"
          data-cursor="hover"
        >
          {t('submitAnother')}
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div>
          <label className="fl-label" htmlFor="ce-firstName">{t('firstName')} *</label>
          <input
            id="ce-firstName"
            type="text"
            required
            value={form.firstName}
            onChange={(e) => setForm({ ...form, firstName: e.target.value })}
            className="fl-input"
            placeholder={t('firstNamePlaceholder')}
          />
        </div>
        <div>
          <label className="fl-label" htmlFor="ce-lastName">{t('lastName')} *</label>
          <input
            id="ce-lastName"
            type="text"
            required
            value={form.lastName}
            onChange={(e) => setForm({ ...form, lastName: e.target.value })}
            className="fl-input"
            placeholder={t('lastNamePlaceholder')}
          />
        </div>
      </div>

      <div>
        <label className="fl-label" htmlFor="ce-email">{t('email')} *</label>
        <input
          id="ce-email"
          type="email"
          required
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          className="fl-input"
          placeholder={t('emailPlaceholder')}
        />
      </div>

      <div>
        <label className="fl-label" htmlFor="ce-topic">{t('topic')} *</label>
        <input
          id="ce-topic"
          type="text"
          required
          value={form.tourType}
          onChange={(e) => setForm({ ...form, tourType: e.target.value })}
          className="fl-input"
          placeholder={t('topicPlaceholder')}
        />
      </div>

      <div>
        <label className="fl-label" htmlFor="ce-message">{t('message')} *</label>
        <textarea
          id="ce-message"
          required
          rows={4}
          value={form.message}
          onChange={(e) => setForm({ ...form, message: e.target.value })}
          className="fl-textarea"
          placeholder={t('messagePlaceholder')}
        />
      </div>

      <Honeypot />

      <button
        type="submit"
        disabled={status === 'sending'}
        className="fl-submit"
        data-cursor="magnetic"
        data-cursor-strength="20"
      >
        <Send size={15} />
        {status === 'sending' ? t('submitting') : t('submit')}
      </button>

      {status === 'error' && (
        <p className="pt-1 text-center text-xs text-red-400/90">
          {t('error')}
        </p>
      )}
    </form>
  );
}
