'use client';
import { parseVideoSource } from '@/lib/video-source';

const NAMES = { bunny: 'Bunny Stream', youtube: 'YouTube', vimeo: 'Vimeo' } as const;

/**
 * Under a lesson's video field: what the pasted link is and how well it is
 * protected, so a paid lesson doesn't go out on a link anyone can share.
 */
export default function VideoLinkHint({ value }: { value: string }) {
  const base = 'text-[10px] mt-1';
  if (!value.trim()) {
    return (
      <p className={`${base} text-ink-muted`}>
        Paste a Bunny Stream, YouTube or Vimeo link, player URL, or full embed code. Use Bunny Stream for paid lessons.
      </p>
    );
  }
  const source = parseVideoSource(value);
  if (!source) {
    return (
      <p className={`${base} text-red-400`}>
        Not a Bunny Stream, YouTube or Vimeo link: learners won&apos;t see a player.
      </p>
    );
  }
  if (source.provider === 'bunny') {
    return (
      <p className={`${base} text-teal-400`}>
        Bunny Stream: protected. Only enrolled learners get a player link, and it expires.
      </p>
    );
  }
  return (
    <p className={`${base} text-amber-400`}>
      {NAMES[source.provider]}: anyone with this link can watch it outside the course. Use Bunny Stream for paid lessons.
    </p>
  );
}
