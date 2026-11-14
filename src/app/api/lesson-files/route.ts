import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { rateLimit } from '@/lib/rateLimit';
import { FILE_REF } from '@/lib/attachments';
import { saveLessonFile } from '@/lib/lesson-files';

/**
 * POST /api/lesson-files — upload a lesson attachment (multipart, field "file").
 *
 * Admins and instructors, from the Course Builder. The file is kept off the
 * public site (lib/lesson-files.ts); the response is the line to add to the
 * lesson's attachments, `Name|lessonfile:<id>`, which the builder inserts.
 */
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'INSTRUCTOR')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const rl = await rateLimit(`lesson-file-upload:${session.user.id}`, 30, 60 * 1000);
    if (!rl.success) return NextResponse.json({ error: 'Too many uploads. Try again shortly.' }, { status: 429 });

    const form = await req.formData();
    const file = form.get('file');
    if (!(file instanceof File)) return NextResponse.json({ error: 'No file in request' }, { status: 400 });

    const saved = await saveLessonFile(file.name, Buffer.from(await file.arrayBuffer()));
    if ('error' in saved) return NextResponse.json({ error: saved.error }, { status: 400 });

    // The name shown to learners: the file name without its extension and without "|" (the line separator).
    const name = file.name.replace(/\.[^.]+$/, '').replace(/[|\r\n]+/g, ' ').trim() || 'Attachment';
    return NextResponse.json({ fileId: saved.fileId, name, line: `${name}|${FILE_REF}${saved.fileId}` });
  } catch (error) {
    console.error('[LESSON-FILE-UPLOAD] Error:', error);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
