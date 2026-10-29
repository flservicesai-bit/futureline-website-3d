import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { syncProgress } from '@/lib/progress';

/**
 * Marks one lesson complete for the signed-in learner and returns the
 * recomputed progress. The client sends which lesson, never a percentage:
 * the percentage is derived on the server from the completed lessons.
 */
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => null);
    const enrollmentId = body?.enrollmentId;
    const lessonId = body?.lessonId;
    if (typeof enrollmentId !== 'string' || !enrollmentId || typeof lessonId !== 'string' || !lessonId) {
      return NextResponse.json({ error: 'enrollmentId and lessonId are required' }, { status: 400 });
    }

    const enrollment = await prisma.enrollment.findUnique({ where: { id: enrollmentId } });
    if (!enrollment || enrollment.userId !== session.user.id) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    const lesson = await prisma.lesson.findUnique({ where: { id: lessonId }, select: { courseId: true } });
    if (!lesson || lesson.courseId !== enrollment.courseId) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    await prisma.lessonProgress.upsert({
      where: { enrollmentId_lessonId: { enrollmentId, lessonId } },
      create: { enrollmentId, lessonId },
      update: {},
    });

    const progress = await syncProgress(enrollmentId, enrollment.courseId);
    return NextResponse.json({ success: true, ...progress });
  } catch {
    return NextResponse.json({ error: 'Failed to update progress' }, { status: 500 });
  }
}
