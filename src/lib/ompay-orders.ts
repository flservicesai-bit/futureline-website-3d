/**
 * Card orders paid through OMPay: settling them against OMPay's own status.
 *
 * Every path that can learn a payment's outcome goes through settleOmpayOrder:
 * the customer coming back from the payment page, the course page noticing a
 * pending card order, a new checkout attempt, the admin "Check status" action
 * and the hourly reconciliation sweep. It asks OMPay, never the browser, and
 * is safe to run any number of times, concurrently: only one caller can move
 * an order out of PENDING, so the enrolment email goes out once.
 */
import { randomBytes } from 'node:crypto';
import { prisma } from '@/lib/prisma';
import { notifyNewEnrollment } from '@/lib/notifications';
import { inquire, outcomeOf, OmpayError, type OmpayOutcome } from '@/lib/ompay';

export const OMPAY_METHOD = 'OMPAY';

/** A card order still unresolved after this long is closed as expired. */
const ABANDON_AFTER_MS = 7 * 24 * 60 * 60 * 1000;

/** A fresh reference_number per attempt. OMPay answers a repeat with 409 DUPLICATE_ENTRY. */
export function newGatewayReference(): string {
  return `FL-${randomBytes(8).toString('hex').toUpperCase()}`;
}

export type SettleResult = {
  outcome: OmpayOutcome;
  courseSlug: string;
};

export async function settleOmpayOrder(orderId: string): Promise<SettleResult | null> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      course: { select: { title: true, slug: true } },
      user: { select: { firstName: true, lastName: true, email: true } },
    },
  });
  if (!order || order.paymentMethod !== OMPAY_METHOD) return null;

  const courseSlug = order.course.slug;
  if (order.paymentStatus === 'COMPLETED') return { outcome: 'paid', courseSlug };
  if (order.paymentStatus !== 'PENDING') return { outcome: 'failed', courseSlug };

  // Nothing was ever registered with OMPay (the create call failed): there is
  // no payment to ask about.
  if (!order.gatewayTxnId && !order.gatewayReference) {
    await prisma.order.updateMany({
      where: { id: order.id, paymentStatus: 'PENDING' },
      data: { paymentStatus: 'FAILED', gatewayStatus: 'NOT_REGISTERED' },
    });
    return { outcome: 'failed', courseSlug };
  }

  let status: string;
  let transactionId: string | null = null;
  try {
    const result = await inquire(
      order.gatewayTxnId ? { transactionId: order.gatewayTxnId } : { reference: order.gatewayReference! },
    );
    status = result.status;
    transactionId = result.transactionId;
  } catch (err) {
    // OMPay unreachable or refusing: leave the order pending and try again later.
    const e = err as OmpayError;
    console.error(`[OMPay] Inquiry failed for order ${order.id}: ${e.code || ''} ${e.message}`);
    return { outcome: 'pending', courseSlug };
  }

  const outcome = outcomeOf(status);
  const gatewayTxnId = order.gatewayTxnId || transactionId;

  if (outcome === 'paid') {
    const moved = await prisma.$transaction(async (tx) => {
      // Conditional update: a simultaneous settle finds nothing left to change.
      const { count } = await tx.order.updateMany({
        where: { id: order.id, paymentStatus: 'PENDING' },
        data: { paymentStatus: 'COMPLETED', gatewayStatus: status, gatewayTxnId, paidAt: new Date() },
      });
      if (count === 0) return false;
      // They paid, so they get their place even if the course filled up in the
      // meantime; the seat limit was checked when the payment started.
      await tx.enrollment.upsert({
        where: { userId_courseId: { userId: order.userId, courseId: order.courseId } },
        create: { userId: order.userId, courseId: order.courseId },
        update: {},
      });
      return true;
    });
    if (moved) {
      console.log(`[OMPay] Order ${order.id} paid (${order.gatewayReference}), enrolled user ${order.userId}`);
      notifyNewEnrollment(
        { name: `${order.user.firstName} ${order.user.lastName}`.trim() || 'Student', email: order.user.email },
        { title: order.course.title, slug: courseSlug },
      ).catch((err) => console.error('[OMPay] Failed to send enrolment email:', err));
    }
    return { outcome: 'paid', courseSlug };
  }

  if (outcome === 'failed') {
    await prisma.order.updateMany({
      where: { id: order.id, paymentStatus: 'PENDING' },
      data: { paymentStatus: 'FAILED', gatewayStatus: status, gatewayTxnId },
    });
    return { outcome: 'failed', courseSlug };
  }

  // Still in flight. A payment page abandoned for a week is not coming back.
  const abandoned = Date.now() - order.createdAt.getTime() > ABANDON_AFTER_MS;
  await prisma.order.updateMany({
    where: { id: order.id, paymentStatus: 'PENDING' },
    data: abandoned
      ? { paymentStatus: 'FAILED', gatewayStatus: 'EXPIRED', gatewayTxnId }
      : { gatewayStatus: status || null, gatewayTxnId },
  });
  return { outcome: abandoned ? 'failed' : 'pending', courseSlug };
}

/**
 * Settles this learner's open card orders for one course. Returns true as soon
 * as one turns out to be paid. Used before starting another payment, so a
 * customer who paid and closed the tab is enrolled instead of charged twice.
 */
export async function settleOpenOmpayOrders(userId: string, courseId: string): Promise<boolean> {
  const open = await prisma.order.findMany({
    where: { userId, courseId, paymentMethod: OMPAY_METHOD, paymentStatus: 'PENDING' },
    select: { id: true },
    orderBy: { createdAt: 'desc' },
    take: 5,
  });
  for (const { id } of open) {
    const result = await settleOmpayOrder(id);
    if (result?.outcome === 'paid') return true;
  }
  return false;
}

/** The hourly sweep: every unresolved card order, oldest first. */
export async function reconcileOmpayOrders(limit = 50) {
  const open = await prisma.order.findMany({
    where: { paymentMethod: OMPAY_METHOD, paymentStatus: 'PENDING' },
    select: { id: true },
    orderBy: { createdAt: 'asc' },
    take: limit,
  });
  const tally = { checked: 0, paid: 0, failed: 0, pending: 0 };
  for (const { id } of open) {
    const result = await settleOmpayOrder(id);
    if (!result) continue;
    tally.checked++;
    tally[result.outcome]++;
  }
  return tally;
}
