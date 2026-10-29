import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const data = await req.json();
    const updateData: any = {
      moduleTitle: data.moduleTitle,
      lessonTitle: data.lessonTitle,
      lessonType: data.lessonType || 'CONTENT',
      orderIndex: data.orderIndex,
      videoUrl: data.videoUrl || null,
      content: data.content || null,
      resources: data.resources || null,
      questions: data.questions || null,
    };
    if (data.courseId) updateData.courseId = data.courseId;
    const lesson = await prisma.lesson.update({ where: { id: id }, data: updateData });
    return NextResponse.json(lesson);
  } catch (error: any) {
    return NextResponse.json({ error: "An error occurred" }, { status: 400 });
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    await prisma.lesson.delete({ where: { id: id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: "An error occurred" }, { status: 400 });
  }
}
