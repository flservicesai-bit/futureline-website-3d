import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { extname, join } from 'node:path';
import { PDFDocument, StandardFonts, degrees, rgb } from 'pdf-lib';
import { FILE_ID } from './attachments';

/**
 * Lesson attachments uploaded in the Course Builder. They live outside
 * public/, so no URL reaches them directly: the only way out is
 * /api/lessons/<lesson>/files/<id>, which checks the enrolment and stamps the
 * learner into each copy. The folder survives deploys (deploy.sh hard-resets
 * tracked files only, and /private is git-ignored); set LESSON_FILES_DIR to
 * keep it elsewhere. These are the only copies on the server: back them up.
 */
export function lessonFilesDir() {
  return process.env.LESSON_FILES_DIR || join(process.cwd(), 'private', 'lesson-files');
}

export const MAX_UPLOAD_BYTES = 30 * 1024 * 1024;

const TYPES: Record<string, { mime: string; magic?: number[] }> = {
  '.pdf': { mime: 'application/pdf', magic: [0x25, 0x50, 0x44, 0x46, 0x2d] }, // %PDF-
  '.zip': { mime: 'application/zip', magic: [0x50, 0x4b, 0x03, 0x04] },
  '.png': { mime: 'image/png', magic: [0x89, 0x50, 0x4e, 0x47] },
  '.jpg': { mime: 'image/jpeg', magic: [0xff, 0xd8, 0xff] },
  '.jpeg': { mime: 'image/jpeg', magic: [0xff, 0xd8, 0xff] },
  '.txt': { mime: 'text/plain; charset=utf-8' },
  '.md': { mime: 'text/markdown; charset=utf-8' },
};

export const ALLOWED_EXTENSIONS = Object.keys(TYPES);

export function contentTypeOf(fileId: string) {
  return TYPES[extname(fileId).toLowerCase()]?.mime ?? 'application/octet-stream';
}

/**
 * Checks an upload and stores it under a random name. The extension must be
 * allowed and the bytes must look like it (a renamed .exe isn't a PDF); text
 * files may not contain NUL bytes.
 */
export async function saveLessonFile(name: string, bytes: Buffer): Promise<{ fileId: string } | { error: string }> {
  const ext = extname(name).toLowerCase();
  const type = TYPES[ext];
  if (!type) return { error: `Unsupported file type. Use ${ALLOWED_EXTENSIONS.join(', ')}.` };
  if (bytes.length === 0) return { error: 'The file is empty.' };
  if (bytes.length > MAX_UPLOAD_BYTES) return { error: `File too large. Max ${MAX_UPLOAD_BYTES / 1024 / 1024} MB.` };
  if (type.magic ? !type.magic.every((b, i) => bytes[i] === b) : bytes.subarray(0, 8192).includes(0)) {
    return { error: `This doesn't look like a ${ext.slice(1).toUpperCase()} file.` };
  }
  const fileId = `${randomUUID()}${ext === '.jpeg' ? '.jpg' : ext}`;
  await mkdir(lessonFilesDir(), { recursive: true });
  await writeFile(join(lessonFilesDir(), fileId), bytes, { flag: 'wx' });
  return { fileId };
}

/** The stored bytes, or null when there is no such file. */
export async function readLessonFile(fileId: string): Promise<Buffer | null> {
  if (!FILE_ID.test(fileId)) return null;
  try {
    return await readFile(join(lessonFilesDir(), fileId));
  } catch (error: any) {
    if (error?.code === 'ENOENT') return null;
    throw error;
  }
}

export type Licensee = { email: string; name: string };

/** The standard PDF fonts only cover Latin text, so other characters (an Arabic name) are left out. */
function latin(text: string) {
  return text.replace(/[^\x20-\x7e]/g, '').replace(/\s+/g, ' ').trim();
}

export function licenceLine(who: Licensee, when = new Date()) {
  const name = latin(who.name);
  const date = when.toISOString().slice(0, 10);
  return `Licensed to ${name ? `${name} <${latin(who.email)}>` : latin(who.email)} · FutureLine Academy · ${date} · personal use only`;
}

/**
 * The learner's copy of a PDF: a small licence line along the foot of every
 * page and their email faintly across the middle, plus the same in the
 * document's metadata. Pages keep their content; only the stamp is added.
 */
export async function stampPdf(bytes: Buffer, who: Licensee, when = new Date()): Promise<Uint8Array> {
  const pdf = await PDFDocument.load(bytes, { updateMetadata: false });
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const line = licenceLine(who, when);
  const mark = latin(who.email) || 'FutureLine Academy';
  for (const page of pdf.getPages()) {
    const box = page.getCropBox();
    const footSize = 7;
    const footWidth = font.widthOfTextAtSize(line, footSize);
    page.drawText(line, {
      x: box.x + Math.max(8, (box.width - footWidth) / 2),
      y: box.y + 9,
      size: footSize,
      font,
      color: rgb(0.45, 0.47, 0.52),
      opacity: 0.85,
    });
    const markSize = Math.min(34, box.width / 18);
    const markWidth = font.widthOfTextAtSize(mark, markSize);
    const angle = 30;
    const rad = (angle * Math.PI) / 180;
    page.drawText(mark, {
      x: box.x + box.width / 2 - (markWidth / 2) * Math.cos(rad),
      y: box.y + box.height / 2 - (markWidth / 2) * Math.sin(rad),
      size: markSize,
      font,
      color: rgb(0.3, 0.35, 0.45),
      opacity: 0.07,
      rotate: degrees(angle),
    });
  }
  pdf.setSubject(licenceLine(who, when));
  pdf.setKeywords([`licensed-to:${latin(who.email)}`, 'FutureLine Academy']);
  pdf.setModificationDate(when);
  return pdf.save();
}

/** The learner's copy of a text file: a licence line on top. */
export function stampText(bytes: Buffer, who: Licensee, when = new Date()): Buffer {
  return Buffer.concat([Buffer.from(`# ${licenceLine(who, when)}\n\n`, 'utf8'), bytes]);
}
