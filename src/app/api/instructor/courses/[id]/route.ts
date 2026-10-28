import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { normalizeCourseData } from '@/lib/validations';

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

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { course } = await requireInstructorOwnership(id);
    return NextResponse.json(course);
  } catch (error: any) {
    return NextResponse.json({ error: "An error occurred" }, { status: 403 });
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { course } = await requireInstructorOwnership(id);
    if (course.status === 'DELETED') {
      return NextResponse.json({ error: 'Archived courses can only be restored by an admin' }, { status: 403 });
    }
    const data = await req.json();
    delete data.instructorId;
    delete data.approvalStatus;
    const fields = normalizeCourseData(data);
    // Admin-only fields: featuring, and the reviewer's rejection note.
    delete fields.featuredSlot;
    delete fields.rejectionReason;
    const updated = await prisma.course.update({
      where: { id: id },
      data: { ...fields, approvalStatus: 'PENDING' },
    });
    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json({ error: "An error occurred" }, { status: 400 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await requireInstructorOwnership(id);

    // Instead of deleting, just move to archive (DELETED status)
    await prisma.course.update({
      where: { id: id },
      data: { status: 'DELETED' }
    });
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: "An error occurred" }, { status: 400 });
  }
}
