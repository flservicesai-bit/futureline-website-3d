'use client';
import { useSession } from 'next-auth/react';
import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Link, useRouter } from '@/i18n/routing';
import { CheckCircle, Clock, CreditCard, Lock } from 'lucide-react';

/** Where the signed-in visitor stands with this course, worked out on the server. */
export type EnrollState = 'none' | 'pending' | 'enrolled';

/**
 * Enrol in a course. Free courses enrol directly; paid courses are paid by
 * card on OMPay's hosted payment page (the only payment method). `pending`
 * only appears for bank-transfer requests made before card payment replaced
 * bank transfer, which an admin still approves in Admin > Orders.
 */
export default function EnrollButton({
  courseId,
  slug,
  price = 0,
  state = 'none',
  cardEnabled = false,
  paymentNotice,
}: {
  courseId: string;
  slug: string;
  /** The price actually charged: the discount price when there is one. */
  price?: number;
  state?: EnrollState;
  /** OMPay keys are configured on the server, so card payment is available. */
  cardEnabled?: boolean;
  /** Back from OMPay's payment page without a confirmed payment. */
  paymentNotice?: 'failed' | 'pending';
}) {
  const t = useTranslations('enroll');
  const locale = useLocale();
  const { data: session } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [cardError, setCardError] = useState<string | null>(null);

  const isFree = price <= 0;
  const coursePath = `/dashboard/course/${slug}`;

  // Signed-out visitors sign in first and come straight back to this course.
  const goToLogin = () =>
    router.push({ pathname: '/login', query: { callbackUrl: `/${locale}/courses/${slug}` } });

  const handleFreeEnroll = async () => {
    if (!session) { goToLogin(); return; }
    setLoading(true);
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseId }),
      });
      const data = await res.json();
      if (data.enrolled) {
        router.push(`/dashboard/course/${data.slug || slug}`);
      } else {
        alert(data.error || t('somethingWentWrong'));
      }
    } catch {
      alert(t('failedToProcess'));
    } finally {
      setLoading(false);
    }
  };

  // Card: the server registers the payment with OMPay and returns its hosted
  // payment page. The browser leaves the site; OMPay sends it back to
  // /api/payments/ompay/return, which confirms the payment server to server.
  const handleCardPay = async () => {
    if (!session) { goToLogin(); return; }
    setCardError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseId, paymentMethod: 'OMPAY', locale }),
      });
      const data = await res.json();
      if (data.redirectUrl) {
        window.location.assign(data.redirectUrl);
        return; // keep the spinner until the payment page loads
      }
      if (data.enrolled) {
        router.push(`/dashboard/course/${data.slug || slug}`);
        return;
      }
      if (data.paymentPending) {
        setCardError(t('cardPaymentPending'));
      } else {
        setCardError(res.status === 502 || res.status === 503 ? t('cardUnavailable') : data.error || t('somethingWentWrongRetry'));
      }
    } catch {
      setCardError(t('cardUnavailable'));
    }
    setLoading(false);
  };

  const primaryClass =
    'block w-full rounded-lg bg-navy py-3 text-center text-[15px] font-semibold text-white transition-colors hover:bg-teal-ink disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal';

  if (state === 'enrolled') {
    return (
      <div className="space-y-3">
        <p className="flex items-center justify-center gap-2 text-sm font-medium text-teal-dark">
          <CheckCircle size={16} aria-hidden /> {t('youAreEnrolled')}
        </p>
        <Link href={coursePath} className={primaryClass}>
          {t('goToCourse')}
        </Link>
      </div>
    );
  }

  if (state === 'pending') {
    return (
      <div role="status" className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-900">
        <p className="flex items-center gap-2 text-sm font-semibold">
          <Clock size={16} aria-hidden /> {t('paymentPending')}
        </p>
        <p className="mt-1.5 text-xs leading-relaxed">{t('pendingApproval')}</p>
      </div>
    );
  }

  if (isFree) {
    return (
      <button onClick={handleFreeEnroll} disabled={loading} className={primaryClass}>
        {loading ? t('processing') : t('enrolForFree')}
      </button>
    );
  }

  const notice =
    cardError ??
    (!cardEnabled
      ? t('cardUnavailable')
      : paymentNotice === 'failed'
        ? t('cardPaymentFailed')
        : paymentNotice === 'pending'
          ? t('cardPaymentPending')
          : null);

  return (
    <div className="space-y-3">
      {notice && (
        <p role="alert" className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs leading-relaxed text-amber-900">
          {notice}
        </p>
      )}

      <button onClick={handleCardPay} disabled={loading || !cardEnabled} className={primaryClass}>
        <span className="inline-flex items-center justify-center gap-2">
          <CreditCard size={16} aria-hidden />
          {loading ? t('redirectingToPayment') : t('payByCard')}
        </span>
      </button>

      <p className="flex items-center justify-center gap-1.5 text-xs text-ink-muted">
        <Lock size={12} aria-hidden /> {t('securedByOmpay')}
      </p>
    </div>
  );
}
