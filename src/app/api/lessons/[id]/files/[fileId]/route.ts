import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { rateLimit, getRateLimitHeaders } from '@/lib/rateLimit';
import { parseAttachments } from '@/lib/attachments';
import { contentTypeOf, readLessonFile, stampPdf, stampText } from '@/lib/lesson-files';

const NO_STORE = { 'Cache-Control': 'private, no-store' };

/** attachment; filename="ascii fallback"; filename*=UTF-8''<the real name, Arabic included> */
function disposition(name: string) {
  const ascii = name.replace(/[^\x20-\x7e]/g, '_').replace(/["\\]/g, '_');
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(name)}`;
}

/**
 * GET /api/lessons/:id/files/:fileId — download one uploaded attachment.
 *
 * Only for a learner enrolled in the lesson's course (and admins, and the
 * course's instructor), and only for a file that lesson lists. Each PDF and
 * text file is stamped with who downloaded it (lib/lesson-files.ts), so a
 * copy passed on shows whose account it came from.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string; fileId: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: NO_STORE });

    const rl = await rateLimit(`lesson-file:${session.user.id}`, 60, 60 * 1000);
    if (!rl.success) {
      return NextResponse.json(
        { error: 'Too many downloads. Please try again shortly.' },
        { status: 429, headers: { ...NO_STORE, ...getRateLimitHeaders(rl.remaining, rl.resetIn) } },
      );
    }

    const { id, fileId } = await params;
    const lesson = await prisma.lesson.findUnique({
      where: { id },
      select: { courseId: true, resources: true, course: { select: { instructorId: true } } },
    });
    const attachment = parseAttachments(lesson?.resources).find((a) => a.kind === 'file' && a.fileId === fileId);
    if (!lesson || !attachment) return NextResponse.json({ error: 'Not found' }, { status: 404, headers: NO_STORE });

    const { role, id: userId } = session.user;
    const allowed =
      role === 'ADMIN' ||
      (role === 'INSTRUCTOR' && lesson.course.instructorId === userId) ||
      (await prisma.enrollment.findUnique({
        where: { userId_courseId: { userId, courseId: lesson.courseId } },
        select: { id: true },
      })) !== null;
    if (!allowed) return NextResponse.json({ error: 'Forbidden' }, { status: 403, headers: NO_STORE });

    const bytes = await readLessonFile(fileId);
    if (!bytes) {
      console.error(`[LESSON-FILE] Listed but missing on disk: ${fileId} (lesson ${id})`);
      return NextResponse.json({ error: 'Not found' }, { status: 404, headers: NO_STORE });
    }

    const who = { email: session.user.email ?? '', name: `${session.user.firstName ?? ''} ${session.user.lastName ?? ''}` };
    const ext = fileId.slice(fileId.lastIndexOf('.'));
    const body =
      ext === '.pdf' ? await stampPdf(bytes, who) : ext === '.txt' || ext === '.md' ? stampText(bytes, who) : bytes;
    const name = attachment.name.toLowerCase().endsWith(ext) ? attachment.name : `${attachment.name}${ext}`;

    return new Response(body as BodyInit, {
      headers: {
        ...NO_STORE,
        'Content-Type': contentTypeOf(fileId),
        'Content-Disposition': disposition(name),
        'Content-Length': String(body.byteLength),
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error) {
    console.error('[LESSON-FILE] Error:', error);
    return NextResponse.json({ error: 'An error occurred' }, { status: 500, headers: NO_STORE });
  }
}
