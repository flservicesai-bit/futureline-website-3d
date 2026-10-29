import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { quizProblem, withScheme } from '@/lib/validations';

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { searchParams } = new URL(req.url);
    const courseId = searchParams.get('courseId');
    const where: any = {};
    if (courseId) where.courseId = courseId;
    const lessons = await prisma.lesson.findMany({
      where,
      include: { course: { select: { title: true } } },
      orderBy: { orderIndex: 'asc' },
    });
    return NextResponse.json(lessons);
  } catch {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const data = await req.json();
    const lessonData: any = {
      courseId: data.courseId,
      moduleTitle: data.moduleTitle,
      lessonTitle: data.lessonTitle,
      lessonType: data.lessonType || 'CONTENT',
      orderIndex: data.orderIndex,
      videoUrl: withScheme(data.videoUrl) || null,
      content: data.content || null,
      resources: data.resources || null,
      questions: data.questions || null,
    };
    const problem = quizProblem(lessonData.lessonType, lessonData.questions);
    if (problem) return NextResponse.json({ error: problem }, { status: 400 });
    const lesson = await prisma.lesson.create({ data: lessonData });
    return NextResponse.json(lesson);
  } catch (error: any) {
    return NextResponse.json({ error: "An error occurred" }, { status: 400 });
  }
}
