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

    const { courseId, oldName, newName } = await req.json();

    if (!courseId || !oldName || !newName?.trim()) {
      return NextResponse.json({ error: 'courseId, oldName, and newName are required' }, { status: 400 });
    }

    await prisma.lesson.updateMany({
      where: { courseId, moduleTitle: oldName },
      data: { moduleTitle: newName.trim() },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: "An error occurred" }, { status: 500 });
  }
}
