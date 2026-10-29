import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { parseCommissionRate } from '@/lib/validations';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: instructorId } = await params;
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { amount, period, courseId, notes } = await req.json();
    if (!amount || !period) {
      return NextResponse.json({ error: 'Amount and period are required' }, { status: 400 });
    }

    const instructor = await prisma.user.findUnique({
      where: { id: instructorId },
      select: { commissionRate: true },
    });
    if (!instructor) {
      return NextResponse.json({ error: 'Instructor not found' }, { status: 404 });
    }

    const instructorCut = Number(amount);
    if (!Number.isFinite(instructorCut) || instructorCut <= 0) {
      return NextResponse.json({ error: 'Amount must be a positive number' }, { status: 400 });
    }
    // commissionRate is the instructor's share (%). A 0% rate makes the
    // platform-cut formula below divide by zero → Infinity, so reject it.
    if (!instructor.commissionRate || instructor.commissionRate <= 0) {
      return NextResponse.json(
        { error: 'Instructor commission rate must be greater than 0 to log a payout' },
        { status: 400 },
      );
    }
    const commissionFraction = instructor.commissionRate / 100;
    const platformRate = 1 - commissionFraction;
    const platformCut = instructorCut * (platformRate / commissionFraction);

    const targetCourseId = courseId || (await prisma.course.findFirst({
      where: { instructorId },
      select: { id: true },
    }))?.id;

    if (!targetCourseId) {
      return NextResponse.json({ error: 'Instructor has no courses' }, { status: 400 });
    }

    const earning = await prisma.instructorEarning.create({
      data: {
        instructorId,
        courseId: targetCourseId,
        amount: instructorCut + platformCut,
        instructorCut,
        platformCut,
        period,
      },
    });

    return NextResponse.json(earning);
  } catch {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: instructorId } = await params;
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { commissionRate } = await req.json();
    const rate = parseCommissionRate(commissionRate);
    if (rate === null) {
      return NextResponse.json({ error: 'Commission rate must be a number from 0 to 100' }, { status: 400 });
    }

    const user = await prisma.user.update({
      where: { id: instructorId },
      data: { commissionRate: rate },
      select: { id: true, commissionRate: true },
    });

    return NextResponse.json(user);
  } catch {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
