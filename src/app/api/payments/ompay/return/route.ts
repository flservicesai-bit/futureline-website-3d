import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { locales } from '@/i18n/routing';
import { getClientIp, rateLimit } from '@/lib/rateLimit';
import { OMPAY_METHOD, settleOmpayOrder } from '@/lib/ompay-orders';

/**
 * Where OMPay sends the customer back after the hosted payment page.
 *
 * The query string is untrusted: it only says which order to look at. The
 * outcome always comes from OMPay's inquiry API, using the transaction id we
 * stored when the payment was created, never the one in this URL.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const localeParam = url.searchParams.get('locale') || '';
  const locale = (locales as readonly string[]).includes(localeParam) ? localeParam : 'en';
  const origin = (process.env.APP_URL || url.origin).replace(/\/+$/, '');
  const to = (path: string) => NextResponse.redirect(`${origin}/${locale}${path}`, 303);

  const rl = await rateLimit(`ompay-return:${getClientIp(req)}`, 30, 60 * 1000);
  if (!rl.success) return to('/courses');

  // OMPay appends its reference_number; our own order id is in the URL we gave it.
  const reference = url.searchParams.get('reference_number');
  const orderId = url.searchParams.get('order');
  const order = reference
    ? await prisma.order.findUnique({ where: { gatewayReference: reference }, select: { id: true, paymentMethod: true } })
    : orderId
      ? await prisma.order.findUnique({ where: { id: orderId }, select: { id: true, paymentMethod: true } })
      : null;

  if (!order || order.paymentMethod !== OMPAY_METHOD) return to('/courses');

  const result = await settleOmpayOrder(order.id);
  if (!result) return to('/courses');

  if (result.outcome === 'paid') return to(`/dashboard/course/${result.courseSlug}`);
  return to(`/courses/${result.courseSlug}?payment=${result.outcome}`);
}
