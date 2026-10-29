import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { lessonSchema, formatZodError, quizProblem } from '@/lib/validations';

async function requireInstructorLessonOwnership(lessonId: string) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'INSTRUCTOR') {
    throw new Error('Unauthorized');
  }
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    include: { course: { select: { instructorId: true } } },
  });
  if (!lesson || lesson.course.instructorId !== session.user.id) {
    throw new Error('Lesson not found or not yours');
  }
  return { session, lesson };
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { lesson } = await requireInstructorLessonOwnership(id);
    const body = await req.json();
    
    const parsed = lessonSchema.partial().safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: formatZodError(parsed.error) }, { status: 400 });
    }
    // A partial update: check the quiz as it will be after the change.
    const problem = quizProblem(
      parsed.data.lessonType ?? lesson.lessonType,
      parsed.data.questions !== undefined ? parsed.data.questions : lesson.questions,
    );
    if (problem) return NextResponse.json({ error: problem }, { status: 400 });

    const { courseId, ...updateData } = parsed.data;
    
    const updated = await prisma.lesson.update({
      where: { id: id },
      data: updateData,
    });
    return NextResponse.json(updated);
  } catch (error: any) {
    console.error('[LESSON-UPDATE] Error:', error);
    return NextResponse.json({ error: 'Failed to update lesson' }, { status: 400 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await requireInstructorLessonOwnership(id);
    await prisma.lesson.delete({ where: { id: id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[LESSON-DELETE] Error:', error);
    return NextResponse.json({ error: 'Failed to delete lesson' }, { status: 400 });
  }
}
