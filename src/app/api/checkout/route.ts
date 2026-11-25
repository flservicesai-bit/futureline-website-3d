import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { notifyNewEnrollment } from '@/lib/notifications';
import { rateLimit, getRateLimitHeaders } from '@/lib/rateLimit';
import { locales } from '@/i18n/routing';
import { createHostedPayment, ompayConfigured, OmpayError } from '@/lib/ompay';
import { newGatewayReference, OMPAY_METHOD, settleOmpayOrder, settleOpenOmpayOrders } from '@/lib/ompay-orders';

const CARD_UNAVAILABLE = 'Card payment is unavailable right now. Please try again shortly.';

/** The site's own origin, for the URL OMPay sends the customer back to. */
function siteOrigin(req: Request) {
  const base =
    process.env.APP_URL ||
    `${req.headers.get('x-forwarded-proto') || 'http'}://${req.headers.get('host') || 'localhost:5000'}`;
  return base.replace(/\/+$/, '');
}

/**
 * Card checkout: registers the payment with OMPay and hands back the URL of
 * OMPay's hosted payment page. The learner is enrolled only once OMPay itself
 * confirms the payment (see lib/ompay-orders.ts).
 */
async function startCardPayment(
  req: Request,
  {
    userId,
    course,
    amount,
    locale,
  }: {
    userId: string;
    course: { id: string; slug: string; seatCapacity: number | null };
    amount: number;
    locale: string;
  },
) {
  if (!ompayConfigured()) {
    return NextResponse.json({ error: CARD_UNAVAILABLE }, { status: 503 });
  }

  // Paid and closed the tab before coming back? Enrol now rather than charge twice.
  if (await settleOpenOmpayOrders(userId, course.id)) {
    return NextResponse.json({ enrolled: true, slug: course.slug });
  }

  // Check the seat limit before taking money, not after.
  if (course.seatCapacity) {
    const taken = await prisma.enrollment.count({ where: { courseId: course.id } });
    if (taken >= course.seatCapacity) {
      return NextResponse.json({ error: 'Course is full' }, { status: 400 });
    }
  }

  const order = await prisma.order.create({
    data: {
      userId,
      courseId: course.id,
      amount,
      paymentStatus: 'PENDING',
      paymentMethod: OMPAY_METHOD,
      gatewayReference: newGatewayReference(),
    },
  });

  const returnUrl = `${siteOrigin(req)}/api/payments/ompay/return?order=${encodeURIComponent(order.id)}&locale=${locale}`;

  let payment;
  try {
    payment = await createHostedPayment({
      amount,
      currency: 'OMR',
      reference: order.gatewayReference!,
      returnUrl,
    });
  } catch (err) {
    const e = err as OmpayError;
    // IP_NOT_ALLOWED: this server's IP is not whitelisted in the OMPay portal.
    // MERCHANT_CAPABILITY_DISABLED (402): the hosted flow is not enabled on the account.
    console.error(`[OMPay] Create payment failed for order ${order.id}: ${e.httpStatus || ''} ${e.code || ''} ${e.message}`);
    await prisma.order.updateMany({
      where: { id: order.id, paymentStatus: 'PENDING' },
      data: { paymentStatus: 'FAILED', gatewayStatus: e.code || 'CREATE_FAILED' },
    });
    return NextResponse.json({ error: CARD_UNAVAILABLE }, { status: 502 });
  }

  await prisma.order.update({
    where: { id: order.id },
    data: { gatewayTxnId: payment.transactionId, gatewayStatus: payment.status || null },
  });

  if (payment.redirectUrl) {
    return NextResponse.json({ redirectUrl: payment.redirectUrl });
  }

  // No payment page to visit: OMPay settled it straight away. Ask for the outcome.
  const settled = await settleOmpayOrder(order.id);
  if (settled?.outcome === 'paid') {
    return NextResponse.json({ enrolled: true, slug: course.slug });
  }
  if (settled?.outcome === 'failed') {
    return NextResponse.json({ error: 'The card payment was not completed. Please try again.' }, { status: 402 });
  }
  return NextResponse.json({ paymentPending: true });
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rl = await rateLimit(`checkout:${session.user.id}`, 10, 60 * 1000);
    if (!rl.success) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429, headers: getRateLimitHeaders(rl.remaining, rl.resetIn) }
      );
    }

    const { courseId, paymentMethod, locale } = await req.json();
    const course = await prisma.course.findUnique({ where: { id: courseId } });
    // Only courses the public can see can be bought: published AND approved.
    if (!course || course.status !== 'PUBLISHED' || course.approvalStatus !== 'APPROVED') {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }

    const existing = await prisma.enrollment.findUnique({
      where: { userId_courseId: { userId: session.user.id, courseId } },
    });
    if (existing) {
      return NextResponse.json({ enrolled: true, slug: course.slug, message: 'Already enrolled' });
    }

    // The price actually charged, as shown on the course page: a discount to 0
    // makes the course free.
    const amount = course.discountPrice ?? course.price;
    if (amount > 0) {
      // Card through OMPay is the only way to pay. Bank transfer was retired;
      // requests made before that are still approved in Admin > Orders.
      if (paymentMethod === OMPAY_METHOD) {
        return startCardPayment(req, {
          userId: session.user.id,
          course,
          amount,
          locale: locales.includes(locale) ? locale : 'en',
        });
      }

      return NextResponse.json(
        { paymentRequired: true, error: 'This course is paid by card.' },
        { status: 400 },
      );
    }

    if (course.seatCapacity) {
      const enrollmentCount = await prisma.enrollment.count({ where: { courseId } });
      if (enrollmentCount >= course.seatCapacity) {
        return NextResponse.json({ error: 'Course is full' }, { status: 400 });
      }
    }

    await prisma.enrollment.create({
      data: {
        userId: session.user.id,
        courseId: course.id,
      },
    });

    notifyNewEnrollment(
      { name: `${(session.user as any).firstName || ''} ${(session.user as any).lastName || ''}`.trim() || 'Student', email: session.user.email || '' },
      { title: course.title, slug: course.slug }
    );

    return NextResponse.json({ enrolled: true, slug: course.slug });
  } catch (error) {
    console.error('Enrollment error:', error);
    return NextResponse.json({ error: 'Enrolment failed' }, { status: 500 });
  }
}
