/**
 * GET /uploads/* — serves files written to public/uploads at runtime
 * (instructor photos, video-lab results).
 *
 * `next start` only serves public/ files that existed when the server booted,
 * so anything uploaded afterwards returned 404 until the next restart. Files
 * present at boot are still served by Next's static handler; this route only
 * sees the ones it misses. Limited to the types the upload routes write.
 */
import { createReadStream } from 'fs';
import { stat } from 'fs/promises';
import { extname, join, resolve, sep } from 'path';
import { Readable } from 'stream';

const ROOT = resolve(process.cwd(), 'public', 'uploads');

const CONTENT_TYPES: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.mp4': 'video/mp4',
};

const notFound = () => new Response('Not found', { status: 404 });

export async function GET(req: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const file = resolve(join(ROOT, ...path));
  // Stay inside public/uploads ("../" segments, encoded or not).
  if (!file.startsWith(ROOT + sep)) return notFound();
  const type = CONTENT_TYPES[extname(file).toLowerCase()];
  if (!type) return notFound();

  const info = await stat(file).catch(() => null);
  if (!info?.isFile()) return notFound();

  const headers: Record<string, string> = {
    'Content-Type': type,
    'Accept-Ranges': 'bytes',
    'Cache-Control': 'public, max-age=3600',
    'X-Content-Type-Options': 'nosniff',
  };

  // Byte ranges: Safari will not play an MP4 without them.
  const range = /^bytes=(\d*)-(\d*)$/.exec(req.headers.get('range') ?? '');
  if (range && (range[1] || range[2])) {
    const size = info.size;
    const start = range[1] ? Number(range[1]) : Math.max(0, size - Number(range[2]));
    const end = range[1] && range[2] ? Math.min(Number(range[2]), size - 1) : size - 1;
    if (start > end || start >= size) {
      return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${size}` } });
    }
    const stream = Readable.toWeb(createReadStream(file, { start, end })) as ReadableStream;
    return new Response(stream, {
      status: 206,
      headers: { ...headers, 'Content-Range': `bytes ${start}-${end}/${size}`, 'Content-Length': String(end - start + 1) },
    });
  }

  const stream = Readable.toWeb(createReadStream(file)) as ReadableStream;
  return new Response(stream, { headers: { ...headers, 'Content-Length': String(info.size) } });
}
