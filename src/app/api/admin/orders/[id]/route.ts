import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { notifyNewEnrollment, notifyOrderRejected } from '@/lib/notifications';

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { action } = await req.json();

    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    const order = await prisma.order.findUnique({ where: { id } });
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }
    // Only a pending order can be decided. Approving twice re-sent the
    // enrolment email; rejecting a completed order kept the learner enrolled
    // while removing the revenue from payouts.
    if (order.paymentStatus !== 'PENDING') {
      return NextResponse.json(
        { error: `This order is already ${order.paymentStatus.toLowerCase()}.` },
        { status: 409 },
      );
    }

    if (action === 'approve') {
      // Paid courses honour the seat limit too (free enrolment already did).
      const limits = await prisma.course.findUnique({
        where: { id: order.courseId },
        select: { seatCapacity: true },
      });
      if (limits?.seatCapacity) {
        const [taken, alreadyEnrolled] = await Promise.all([
          prisma.enrollment.count({ where: { courseId: order.courseId } }),
          prisma.enrollment.findUnique({
            where: { userId_courseId: { userId: order.userId, courseId: order.courseId } },
            select: { id: true },
          }),
        ]);
        if (!alreadyEnrolled && taken >= limits.seatCapacity) {
          return NextResponse.json({ error: 'This course is full.' }, { status: 409 });
        }
      }

      const updatedOrder = await prisma.$transaction(async (tx) => {
        // Conditional update: a second, simultaneous approval finds nothing to change.
        const { count } = await tx.order.updateMany({
          where: { id, paymentStatus: 'PENDING' },
          data: { paymentStatus: 'COMPLETED' },
        });
        if (count === 0) return null;
        await tx.enrollment.upsert({
          where: { userId_courseId: { userId: order.userId, courseId: order.courseId } },
          create: { userId: order.userId, courseId: order.courseId },
          update: {},
        });
        return tx.order.findUnique({ where: { id } });
      });
      if (!updatedOrder) {
        return NextResponse.json({ error: 'This order was already handled.' }, { status: 409 });
      }

      const [user, course] = await Promise.all([
        prisma.user.findUnique({ where: { id: order.userId }, select: { firstName: true, lastName: true, email: true } }),
        prisma.course.findUnique({ where: { id: order.courseId }, select: { title: true, slug: true } }),
      ]);

      if (user && course) {
        notifyNewEnrollment(
          { name: `${user.firstName} ${user.lastName}`.trim(), email: user.email },
          { title: course.title, slug: course.slug }
        ).catch(err => console.error('[OrderApproval] Failed to send enrollment email:', err));
      }

      return NextResponse.json(updatedOrder);
    }

    const { count } = await prisma.order.updateMany({
      where: { id, paymentStatus: 'PENDING' },
      data: { paymentStatus: 'FAILED' },
    });
    if (count === 0) {
      return NextResponse.json({ error: 'This order was already handled.' }, { status: 409 });
    }
    const updated = await prisma.order.findUnique({ where: { id } });

    const [user, course] = await Promise.all([
      prisma.user.findUnique({ where: { id: order.userId }, select: { firstName: true, lastName: true, email: true } }),
      prisma.course.findUnique({ where: { id: order.courseId }, select: { title: true } }),
    ]);

    if (user && course) {
      notifyOrderRejected(
        { name: `${user.firstName} ${user.lastName}`.trim(), email: user.email },
        { title: course.title }
      ).catch(err => console.error('[OrderRejection] Failed to send rejection email:', err));
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error('[ORDER-ACTION] Error:', error);
    return NextResponse.json({ error: 'An error occurred' }, { status: 500 });
  }
}
