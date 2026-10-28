import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { normalizeCourseData } from '@/lib/validations';

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'ADMIN') throw new Error('Unauthorized');
  return session;
}

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await requireAdmin();
    const course = await prisma.course.findUnique({ where: { id: id } });
    if (!course) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(course);
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await requireAdmin();
    const data = await req.json();
    const { id: _id, createdAt, instructor, _count, ...updateData } = data;
    const normalized = normalizeCourseData(updateData);

    // featuredSlot is @@unique. If admin assigns this course to a slot that
    // another course already holds, transactionally clear the prior holder
    // before updating — "newest assignment wins" instead of erroring out.
    const course = await prisma.$transaction(async (tx) => {
      if (typeof normalized.featuredSlot === 'number') {
        await tx.course.updateMany({
          where: { featuredSlot: normalized.featuredSlot, NOT: { id } },
          data: { featuredSlot: null },
        });
      }
      return tx.course.update({
        where: { id },
        data: normalized,
      });
    });

    return NextResponse.json(course);
  } catch (error: any) {
    // Surface the real Prisma / runtime message so admin sees what
    // actually broke instead of a generic "An error occurred." We log
    // the full error too for stack-trace debugging in the dev console.
    // eslint-disable-next-line no-console
    console.error('PUT /api/admin/courses/[id] failed:', error);
    const message = typeof error?.message === 'string' && error.message
      ? error.message
      : 'An error occurred';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await requireAdmin();

    const course = await prisma.course.findUnique({ where: { id } });
    if (!course) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    // If already in archive/deleted, permanent delete
    if (course.status === 'DELETED') {
      // Orders and payouts are financial records: deleting them changed
      // revenue and what instructors are owed. Such a course stays archived.
      const [orders, earnings] = await Promise.all([
        prisma.order.count({ where: { courseId: id } }),
        prisma.instructorEarning.count({ where: { courseId: id } }),
      ]);
      if (orders > 0 || earnings > 0) {
        return NextResponse.json(
          { error: 'This course has orders or payout records, so it stays in the archive and cannot be permanently deleted.' },
          { status: 409 },
        );
      }
      await prisma.$transaction([
        prisma.lesson.deleteMany({ where: { courseId: id } }),
        prisma.enrollment.deleteMany({ where: { courseId: id } }),
        prisma.order.deleteMany({ where: { courseId: id } }),
        prisma.instructorEarning.deleteMany({ where: { courseId: id } }),
        prisma.course.delete({ where: { id: id } }),
      ]);
      return NextResponse.json({ success: true, permanent: true });
    }

    // Otherwise, move to archive (DELETED status)
    await prisma.course.update({
      where: { id },
      data: { status: 'DELETED' },
    });

    return NextResponse.json({ success: true, archived: true });
  } catch (error: any) {
    return NextResponse.json({ error: "An error occurred" }, { status: 400 });
  }
}
