/**
 * Business events the admin team hears about on Telegram (lib/telegram.ts).
 * Every function is fire-and-forget: call it without await, it never throws.
 */
import { formatPrice } from '@/lib/utils';
import { sendTelegram, tgEscape as e } from '@/lib/telegram';

function adminLink(path: string, label: string) {
  const base = (process.env.APP_URL || 'https://futureline.ai').replace(/\/+$/, '');
  return `<a href="${e(`${base}/en/admin${path}`)}">${e(label)}</a>`;
}

function excerpt(text: string | null | undefined, max = 280) {
  const t = (text || '').trim().replace(/\s+/g, ' ');
  return t.length > max ? `${t.slice(0, max)}…` : t;
}

function fire(html: string) {
  sendTelegram(html).catch(() => {});
}

export function alertNewLead(lead: {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  company?: string | null;
  topic?: string | null;
  source?: string | null;
  message?: string | null;
}) {
  const lines = [
    `🆕 <b>New lead</b> · ${e(lead.source || 'Website')}`,
    `<b>${e(lead.name)}</b>${lead.company ? ` · ${e(lead.company)}` : ''}`,
    `✉️ ${e(lead.email)}${lead.phone ? `   📞 ${e(lead.phone)}` : ''}`,
  ];
  if (lead.topic) lines.push(`Topic: ${e(lead.topic)}`);
  const msg = excerpt(lead.message);
  if (msg) lines.push('', `“${e(msg)}”`);
  lines.push('', adminLink(`/leads/${lead.id}`, 'Open lead'));
  fire(lines.join('\n'));
}

export function alertNewSignup(user: { name: string; email: string; method: 'password' | 'google' }) {
  fire(
    [
      `👤 <b>New sign-up</b> · ${e(user.method === 'google' ? 'Google' : 'email & password')}`,
      `<b>${e(user.name || 'No name')}</b>`,
      `✉️ ${e(user.email)}`,
      '',
      adminLink('/users', 'Open users'),
    ].join('\n'),
  );
}

export function alertCardPayment(p: { amount: number; course: string; name: string; email: string; reference?: string | null }) {
  fire(
    [
      `💳 <b>Card payment received</b> · ${e(formatPrice(p.amount))}`,
      `Course: <b>${e(p.course)}</b>`,
      `${e(p.name)} · ${e(p.email)}`,
      p.reference ? `OMPay ref: <code>${e(p.reference)}</code>` : '',
      '',
      adminLink('/orders', 'Open orders'),
    ]
      .filter((l, i, a) => l !== '' || a[i - 1] !== '')
      .join('\n'),
  );
}

export function alertFreeEnrollment(p: { course: string; name: string; email: string }) {
  fire(
    [
      `🎓 <b>New enrolment</b> (free course)`,
      `Course: <b>${e(p.course)}</b>`,
      `${e(p.name)} · ${e(p.email)}`,
      '',
      adminLink('/enrollments', 'Open enrolments'),
    ].join('\n'),
  );
}

export function alertEmailFailed(p: { to: string; subject: string; type?: string | null; reason?: string | null }) {
  fire(
    [
      `⚠️ <b>Email not delivered</b>${p.type ? ` · ${e(p.type)}` : ''}`,
      `To: ${e(p.to)}`,
      `Subject: ${e(p.subject)}`,
      p.reason ? `Reason: ${e(excerpt(p.reason, 200))}` : '',
    ]
      .filter(Boolean)
      .join('\n'),
  );
}
