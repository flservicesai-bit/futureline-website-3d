import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { courseSchema, formatZodError, normalizeCourseData } from '@/lib/validations';

async function requireInstructor() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'INSTRUCTOR') {
    throw new Error('Unauthorized');
  }
  return session;
}

export async function GET() {
  try {
    const session = await requireInstructor();
    const courses = await prisma.course.findMany({
      where: { instructorId: session.user.id },
      include: { _count: { select: { enrollments: true, lessons: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(courses);
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireInstructor();
    const body = await req.json();

    // Check for duplicate slug (which is derived from title)
    const existing = await prisma.course.findUnique({
      where: { slug: body.slug }
    });
    if (existing) {
      return NextResponse.json(
        { error: 'A course with this title already exists. Please choose a different title.' },
        { status: 400 }
      );
    }

    const parsed = courseSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: formatZodError(parsed.error) }, { status: 400 });
    }
    const fields = normalizeCourseData(parsed.data);
    // Featuring a course on the home page is an admin decision.
    delete fields.featuredSlot;
    const course = await prisma.course.create({
      data: {
        ...fields,
        instructorId: session.user.id,
        approvalStatus: 'PENDING',
      },
    });
    return NextResponse.json(course);
  } catch (error: any) {
    return NextResponse.json({ error: "An error occurred" }, { status: 400 });
  }
}
