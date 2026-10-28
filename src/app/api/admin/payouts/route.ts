import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const instructors = await prisma.user.findMany({
      where: { role: 'INSTRUCTOR' },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        commissionRate: true,
        // Every course, archived ones included: completed orders are owed
        // whatever happens to the course later, and the instructor's own
        // earnings page counts them too.
        courses: {
          select: {
            id: true,
            title: true,
            orders: {
              where: { paymentStatus: 'COMPLETED' },
              select: { id: true, amount: true, createdAt: true },
            },
          },
        },
        earnings: {
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            amount: true,
            instructorCut: true,
            platformCut: true,
            period: true,
            createdAt: true,
            course: { select: { title: true } },
          },
        },
      },
      orderBy: { firstName: 'asc' },
    });

    const result = instructors.map(inst => {
      const totalRevenue = inst.courses.reduce((sum, c) =>
        sum + c.orders.reduce((s, o) => s + o.amount, 0), 0
      );
      const instructorOwed = totalRevenue * (inst.commissionRate / 100);
      const platformCut = totalRevenue - instructorOwed;
      const totalPaid = inst.earnings.reduce((sum, e) => sum + e.instructorCut, 0);
      const balance = instructorOwed - totalPaid;

      return {
        id: inst.id,
        firstName: inst.firstName,
        lastName: inst.lastName,
        email: inst.email,
        commissionRate: inst.commissionRate,
        totalRevenue,
        instructorOwed,
        platformCut,
        totalPaid,
        balance,
        courses: inst.courses.map(c => ({
          id: c.id,
          title: c.title,
          revenue: c.orders.reduce((s, o) => s + o.amount, 0),
          orderCount: c.orders.length,
        })),
        payoutHistory: inst.earnings,
      };
    });

    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
