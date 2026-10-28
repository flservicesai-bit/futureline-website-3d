import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

async function requireInstructorOwnership(courseId: string) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'INSTRUCTOR') {
    throw new Error('Unauthorized');
  }
  const course = await prisma.course.findFirst({
    where: { id: courseId, instructorId: session.user.id },
  });
  if (!course) throw new Error('Course not found or not yours');
  return { session, course };
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { course } = await requireInstructorOwnership(id);
    const { status } = await req.json();

    if (course.status === 'DELETED') {
      return NextResponse.json({ error: 'Archived courses can only be restored by an admin' }, { status: 403 });
    }

    if (!['DRAFT', 'PUBLISHED', 'ARCHIVED'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    if (status === 'PUBLISHED' && course.approvalStatus !== 'APPROVED') {
      return NextResponse.json({ error: 'Admin approval required to publish' }, { status: 403 });
    }

    const updated = await prisma.course.update({
      where: { id: id },
      data: { status },
    });
    return NextResponse.json(updated);
  } catch (error: any) {
    console.error('[COURSE-STATUS] Error:', error);
    return NextResponse.json({ error: 'Failed to update course status' }, { status: 400 });
  }
}
