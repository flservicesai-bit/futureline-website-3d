import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { rateLimit, getRateLimitHeaders } from '@/lib/rateLimit';
import { parseVideoSource } from '@/lib/video-source';
import { playerUrl } from '@/lib/video-player';

const NO_STORE = { 'Cache-Control': 'private, no-store' };

/**
 * GET /api/lessons/:id/player — the player link for one lesson's video.
 *
 * The course page never sends video links to the browser; the lesson viewer
 * asks here when a lesson is opened. Only learners enrolled in the course get
 * one (plus admins, and the instructor who owns the course), and a Bunny link
 * is signed to expire (lib/video-player.ts), so a copied link stops working.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: NO_STORE });

    const rl = await rateLimit(`player:${session.user.id}`, 120, 60 * 1000);
    if (!rl.success) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again shortly.' },
        { status: 429, headers: { ...NO_STORE, ...getRateLimitHeaders(rl.remaining, rl.resetIn) } },
      );
    }

    const { id } = await params;
    const lesson = await prisma.lesson.findUnique({
      where: { id },
      select: { courseId: true, lessonType: true, videoUrl: true, course: { select: { instructorId: true } } },
    });
    if (!lesson || lesson.lessonType !== 'CONTENT' || !lesson.videoUrl) {
      return NextResponse.json({ error: 'Not found' }, { status: 404, headers: NO_STORE });
    }

    const { role, id: userId } = session.user;
    const allowed =
      role === 'ADMIN' ||
      (role === 'INSTRUCTOR' && lesson.course.instructorId === userId) ||
      (await prisma.enrollment.findUnique({
        where: { userId_courseId: { userId, courseId: lesson.courseId } },
        select: { id: true },
      })) !== null;
    if (!allowed) return NextResponse.json({ error: 'Forbidden' }, { status: 403, headers: NO_STORE });

    const source = parseVideoSource(lesson.videoUrl);
    if (!source) {
      // Saved before this check existed, or a host we can't embed.
      return NextResponse.json({ error: 'Unsupported video link' }, { status: 422, headers: NO_STORE });
    }
    const { url, expiresAt } = playerUrl(source);
    return NextResponse.json({ url, provider: source.provider, expiresAt }, { headers: NO_STORE });
  } catch (error) {
    console.error('[LESSON-PLAYER] Error:', error);
    return NextResponse.json({ error: 'An error occurred' }, { status: 500, headers: NO_STORE });
  }
}
