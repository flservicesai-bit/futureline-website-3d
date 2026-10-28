import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { courseId, updates } = await req.json();

    if (!courseId || !Array.isArray(updates) || updates.length === 0) {
      return NextResponse.json({ error: 'Invalid data: courseId and updates required' }, { status: 400 });
    }

    for (const item of updates) {
      if (!item.id || typeof item.orderIndex !== 'number') {
        return NextResponse.json({ error: 'Each update must have id and orderIndex' }, { status: 400 });
      }
    }

    const lessonIds = updates.map((u: { id: string }) => u.id);
    const existingLessons = await prisma.lesson.findMany({
      where: { id: { in: lessonIds }, courseId },
      select: { id: true },
    });

    if (existingLessons.length !== lessonIds.length) {
      return NextResponse.json({ error: 'Some lesson IDs do not belong to the specified course' }, { status: 400 });
    }

    await prisma.$transaction(
      updates.map((item: { id: string; orderIndex: number }) =>
        prisma.lesson.update({
          where: { id: item.id },
          data: { orderIndex: item.orderIndex },
        })
      )
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Reorder error:', error);
    return NextResponse.json({ error: "An error occurred" }, { status: 500 });
  }
}
