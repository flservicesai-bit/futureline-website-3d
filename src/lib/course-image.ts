import { existsSync } from 'fs';
import { resolve, sep } from 'path';

const PUBLIC = resolve(process.cwd(), 'public');

/**
 * The course image to show, or null for the generated cover. Server-only.
 *
 * A site-relative path is used only if the file is in public/ (runtime
 * uploads land in public/uploads). The seed data pointed courses at
 * /images/*.jpg files that were never added, and each one cost every
 * catalogue view a failed request. Off-site links are passed through; the
 * cover still shows if one fails to load (CoverImage).
 */
export function courseImage(src: string | null | undefined): string | null {
  const s = src?.trim();
  if (!s) return null;
  if (!s.startsWith('/') || s.startsWith('//')) return /^https:\/\//.test(s) ? s : null;
  let file: string;
  try {
    file = resolve(PUBLIC, `.${decodeURIComponent(s.split(/[?#]/)[0])}`);
  } catch {
    return null;
  }
  return file.startsWith(PUBLIC + sep) && existsSync(file) ? s : null;
}
