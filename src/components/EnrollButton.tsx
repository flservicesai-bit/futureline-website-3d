'use client';
import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocale, useTranslations } from 'next-intl';
import { Link, useRouter } from '@/i18n/routing';
import { CheckCircle, Clock, X, CreditCard } from 'lucide-react';

/** Where the signed-in visitor stands with this course, worked out on the server. */
export type EnrollState = 'none' | 'pending' | 'enrolled';

export default function EnrollButton({
  courseId,
  slug,
  price = 0,
  state = 'none',
  bankPayee,
  receiptWhatsapp,
}: {
  courseId: string;
  slug: string;
  /** The price actually charged: the discount price when there is one. */
  price?: number;
  state?: EnrollState;
  /** Bank-transfer details from Admin > Brand. */
  bankPayee: string;
  receiptWhatsapp: string;
}) {
  const t = useTranslations('enroll');
  const locale = useLocale();
  const { data: session } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const isFree = price <= 0;
  const coursePath = `/dashboard/course/${slug}`;

  // Signed-out visitors sign in first and come straight back to this course.
  const goToLogin = () =>
    router.push({ pathname: '/login', query: { callbackUrl: `/${locale}/courses/${slug}` } });

  const closeDialog = () => {
    setShowQR(false);
    // A request was just sent: reload the page data so the button shows it as pending.
    if (submitted) {
      setSubmitted(false);
      router.refresh();
    }
  };

  useEffect(() => {
    if (!showQR) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeDialog();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // closeDialog only reads `submitted`, which is listed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showQR, submitted]);

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

  const handleBankTransferOpen = () => {
    if (!session) { goToLogin(); return; }
    setShowQR(true);
  };

  const handleSubmitBankTransfer = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseId, paymentMethod: 'BANK_TRANSFER' }),
      });
      const data = await res.json();
      if (data.pendingApproval) {
        setSubmitted(true);
      } else if (data.enrolled) {
        router.push(coursePath);
      } else {
        alert(data.error || t('somethingWentWrongRetry'));
      }
    } catch {
      alert(t('failedToSubmit'));
    } finally {
      setLoading(false);
    }
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

  return (
    <div className="space-y-3">
      <button onClick={handleBankTransferOpen} className={primaryClass}>
        {t('payViaBankTransfer')}
      </button>

      <p className="flex items-center justify-center gap-1.5 text-xs text-ink-muted">
        <CreditCard size={13} aria-hidden /> {t('cardComingSoon')}
      </p>

      {/* Rendered on <body>: inside the price card, an animated ancestor
          trapped the "full-screen" overlay in the card, half off-screen. */}
      {showQR &&
        createPortal(
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
            onClick={closeDialog}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="bank-transfer-title"
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm space-y-4 rounded-2xl border border-hairline bg-canvas-card p-6 text-ink shadow-2xl"
            >
              {submitted ? (
                <div className="space-y-4 py-4 text-center">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-teal/20 bg-teal/10">
                    <CheckCircle className="text-teal-ink" size={28} aria-hidden />
                  </div>
                  <h3 id="bank-transfer-title" className="text-lg font-black tracking-tight text-navy">
                    {t('requestSubmitted')}
                  </h3>
                  <p className="text-sm leading-relaxed text-ink-muted">{t('pendingApproval')}</p>
                  <button onClick={closeDialog} className={primaryClass}>
                    {t('close')}
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <h3 id="bank-transfer-title" className="text-base font-black tracking-tight text-navy">
                      {t('bankTransferPayment')}
                    </h3>
                    <button
                      onClick={closeDialog}
                      aria-label={t('close')}
                      className="flex h-7 w-7 items-center justify-center rounded-lg border border-hairline text-ink-muted transition-colors hover:text-navy"
                    >
                      <X size={14} />
                    </button>
                  </div>

                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs leading-relaxed text-amber-900">
                    {t.rich('bankInstructions', {
                      name: bankPayee,
                      phone: receiptWhatsapp,
                      strong: (chunks) => <strong className="font-semibold text-amber-950">{chunks}</strong>,
                    })}
                  </div>

                  <button onClick={handleSubmitBankTransfer} disabled={loading} className={primaryClass}>
                    {loading ? t('submitting') : t('iHavePaid')}
                  </button>
                </>
              )}
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
