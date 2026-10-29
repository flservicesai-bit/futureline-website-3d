'use client';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Send, CheckCircle } from 'lucide-react';
import { Honeypot, HONEYPOT_FIELD, honeypotValue } from '@/components/Honeypot';

export default function ServiceEnquiryForm() {
  const t = useTranslations('serviceForm');
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
        body: JSON.stringify({ ...form, source: 'FL Services', [HONEYPOT_FIELD]: trap }),
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
      <div className="rounded-md border border-lab/30 bg-lab/[0.04] p-10 text-center">
        <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full border border-lab/30 bg-lab/10">
          <CheckCircle size={24} className="text-lab-ink" />
        </div>
        <h3 className="mb-2 text-2xl font-semibold tracking-[-0.01em] text-navy">
          {t('successTitle')}
        </h3>
        <p className="mb-8 text-sm leading-relaxed text-ink-muted">
          {t('successBody')}
        </p>
        <button
          onClick={() => setStatus('idle')}
          className="font-mono text-[11px] uppercase tracking-[0.3em] text-lab-ink transition-colors hover:text-navy"
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
          <label className="fl-label" htmlFor="se-firstName">{t('firstName')} *</label>
          <input
            id="se-firstName"
            type="text"
            required
            value={form.firstName}
            onChange={(e) => setForm({ ...form, firstName: e.target.value })}
            className="fl-input"
            placeholder={t('firstNamePlaceholder')}
          />
        </div>
        <div>
          <label className="fl-label" htmlFor="se-lastName">{t('lastName')} *</label>
          <input
            id="se-lastName"
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
        <label className="fl-label" htmlFor="se-email">{t('email')} *</label>
        <input
          id="se-email"
          type="email"
          required
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          className="fl-input"
          placeholder={t('emailPlaceholder')}
        />
      </div>

      <div>
        <label className="fl-label" htmlFor="se-service">{t('serviceInterest')} *</label>
        <select
          id="se-service"
          required
          value={form.tourType}
          onChange={(e) => setForm({ ...form, tourType: e.target.value })}
          className="fl-select"
        >
          <option value="">{t('selectService')}</option>
          <option value="Digitalisation">{t('digitalisation')}</option>
          <option value="Custom Software">{t('customSoftware')}</option>
          <option value="Automations">{t('automations')}</option>
          <option value="Consultation">{t('consultation')}</option>
          <option value="Other">{t('other')}</option>
        </select>
      </div>

      <div>
        <label className="fl-label" htmlFor="se-message">{t('message')} *</label>
        <textarea
          id="se-message"
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
