/**
 * A lesson's attachments, as saved in `Lesson.resources`: one per line,
 * `Name|link`, a bare link, or plain text. The link is either a web address
 * (shared as it is) or `lessonfile:<id>`, a file uploaded in the Course Builder
 * and kept off the public site (lib/lesson-files.ts): learners get it through
 * /api/lessons/<lesson>/files/<id>, enrolled only, with their name stamped in.
 *
 * Plain string handling, so the lesson forms can use it in the browser too.
 */
export const FILE_REF = 'lessonfile:';

/** Uploaded file ids: a random UUID and one of the allowed extensions. */
export const FILE_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(pdf|txt|md|zip|png|jpe?g)$/;

export type Attachment =
  | { kind: 'file'; name: string; fileId: string }
  | { kind: 'link'; name: string; url: string }
  | { kind: 'text'; name: string };

export function parseAttachments(resources: string | null | undefined): Attachment[] {
  if (!resources) return [];
  return resources
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line): Attachment => {
      const bar = line.indexOf('|');
      const name = bar >= 0 ? line.slice(0, bar).trim() : '';
      const target = (bar >= 0 ? line.slice(bar + 1) : line).trim();
      if (target.startsWith(FILE_REF)) {
        const fileId = target.slice(FILE_REF.length);
        if (FILE_ID.test(fileId)) return { kind: 'file', name: name || fileId, fileId };
        return { kind: 'text', name: name || target };
      }
      try {
        const url = new URL(target);
        if (url.protocol === 'https:' || url.protocol === 'http:') {
          return { kind: 'link', name: name || target.split('/').pop() || 'Download', url: target };
        }
      } catch {
        // not a link
      }
      return { kind: 'text', name: name || target };
    });
}
