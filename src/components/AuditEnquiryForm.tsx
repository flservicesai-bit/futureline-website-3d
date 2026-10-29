/**
 * AuditEnquiryForm — focused lead-capture for the "Get a free systems audit"
 * funnel. Lower-friction than ServiceEnquiryForm: no service-picker (the
 * audit is the entry point, not a service choice), no required message —
 * just first name, last name, email, and an optional one-liner.
 *
 * Posts to /api/leads. `enquiryType` and `source` are overridable so the
 * same form can serve more than one funnel and still be told apart in
 * /admin/leads.
 *
 * All display strings come from the `audit.form` i18n namespace, so the form
 * renders in Arabic under /ar. Input chrome comes from the shared .fl-*
 * classes; only the handful of hard-coded colours in the success panel and
 * helper text need `tone`.
 */
'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Send, CheckCircle } from 'lucide-react';
import { Honeypot, HONEYPOT_FIELD, honeypotValue } from '@/components/Honeypot';

interface Props {
  /** Stored on the lead so funnels are distinguishable in /admin/leads. */
  enquiryType?: string;
  source?: string;
  /** Colour scheme for the copy this component owns. Light matches the site
   *  theme; with 'dark' on a light card the confirmation was white on white. */
  tone?: 'dark' | 'light';
}

export default function AuditEnquiryForm({
  enquiryType = 'Systems Audit',
  source = 'FL Audit Request',
  tone = 'light',
}: Props = {}) {
  const t = useTranslations('audit.form');
  const light = tone === 'light';
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    company: '',
    phone: '',
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
        body: JSON.stringify({
          ...form,
          message: form.message.trim() || 'No detail provided — requested a systems audit.',
          tourType: enquiryType,
          source,
          [HONEYPOT_FIELD]: trap,
        }),
      });
      if (res.ok) {
        setStatus('sent');
        setForm({
          firstName: '',
          lastName: '',
          email: '',
          company: '',
          phone: '',
          message: '',
        });
      } else {
        setStatus('error');
      }
    } catch {
      setStatus('error');
    }
  };

  if (status === 'sent') {
    return (
      <div
        className={`rounded-lg border p-10 text-center ${
          light ? 'border-teal/25 bg-teal/[0.06]' : 'border-lab/30 bg-lab/[0.04]'
        }`}
      >
        <div
          className={`mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full ${
            light ? 'border border-teal/30 bg-teal/10' : 'border border-lab/30 bg-lab/10'
          }`}
        >
          <CheckCircle size={24} className={light ? 'text-teal' : 'text-lab'} />
        </div>
        <h3
          className={`mb-2 text-2xl font-semibold tracking-[-0.01em] ${
            light ? 'font-display text-ink' : 'text-white'
          }`}
        >
          {t('successTitle')}
        </h3>
        <p className={`mb-8 text-sm leading-relaxed ${light ? 'text-ink-muted' : 'text-white/60'}`}>
          {t('successBody')}
        </p>
        <button
          onClick={() => setStatus('idle')}
          className={`font-mono text-[11px] uppercase tracking-[0.3em] transition-colors ${
            light ? 'text-teal hover:text-teal-dark' : 'text-lab hover:text-lab-light'
          }`}
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
          <label className="fl-label" htmlFor="ae-firstName">{t('firstName')} *</label>
          <input
            id="ae-firstName"
            type="text"
            required
            value={form.firstName}
            onChange={(e) => setForm({ ...form, firstName: e.target.value })}
            className="fl-input"
            placeholder={t('firstNamePlaceholder')}
          />
        </div>
        <div>
          <label className="fl-label" htmlFor="ae-lastName">{t('lastName')} *</label>
          <input
            id="ae-lastName"
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
        <label className="fl-label" htmlFor="ae-email">{t('email')} *</label>
        <input
          id="ae-email"
          type="email"
          required
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          className="fl-input"
          placeholder={t('emailPlaceholder')}
        />
      </div>

      {/* Company + Phone — both optional. Help the sales team qualify the
          lead but don't gate the submission on them. */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div>
          <label className="fl-label" htmlFor="ae-company">
            {t('company')} <span className={light ? 'text-ink-muted/70' : 'text-white/40'}>{t('optional')}</span>
          </label>
          <input
            id="ae-company"
            type="text"
            value={form.company}
            onChange={(e) => setForm({ ...form, company: e.target.value })}
            className="fl-input"
            placeholder={t('companyPlaceholder')}
          />
        </div>
        <div>
          <label className="fl-label" htmlFor="ae-phone">
            {t('phone')} <span className={light ? 'text-ink-muted/70' : 'text-white/40'}>{t('optional')}</span>
          </label>
          <input
            id="ae-phone"
            type="tel"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            className="fl-input"
            placeholder="+968 9765 3461"
          />
        </div>
      </div>

      <div>
        <label className="fl-label" htmlFor="ae-message">
          {t('messageLabel')} <span className={light ? 'text-ink-muted/70' : 'text-white/40'}>{t('optional')}</span>
        </label>
        <textarea
          id="ae-message"
          rows={3}
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
        data-cursor-strength="22"
      >
        <Send size={15} />
        {status === 'sending' ? t('submitting') : t('submit')}
      </button>

      {status === 'error' && (
        <p className={`pt-1 text-center text-xs ${light ? 'text-red-600' : 'text-red-400/90'}`}>
          {t('error')}
        </p>
      )}

      <p className={`pt-2 text-center text-[11px] leading-relaxed ${light ? 'text-ink-muted' : 'text-white/45'}`}>
        {t('disclaimer')}
      </p>
    </form>
  );
}
