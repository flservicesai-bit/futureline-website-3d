import { createHash } from 'node:crypto';
import type { VideoSource } from './video-source';

/**
 * How long a signed Bunny player link works. The link is only checked when the
 * player loads, so a lesson that started keeps playing past it; 2 hours matches
 * the sign-in session (lib/auth.ts) and is the most a copied link is good for.
 */
export const PLAYER_LINK_TTL_SECONDS = 2 * 60 * 60;

let warnedUnsigned = false;

/**
 * The iframe URL for a lesson video. Server only: Bunny links are signed with
 * the library's token authentication key (Bunny's embed view token: SHA-256 hex
 * of key + video id + expiry, sent as ?token=&expires=). Without
 * BUNNY_STREAM_TOKEN_KEY the link goes out unsigned, which only plays while
 * token authentication is off in the library; its allowed-domains list is then
 * the only protection.
 */
export function playerUrl(src: VideoSource, now = Date.now()): { url: string; expiresAt: number | null } {
  if (src.provider === 'youtube') {
    return { url: `https://www.youtube.com/embed/${src.videoId}?rel=0&modestbranding=1`, expiresAt: null };
  }
  if (src.provider === 'vimeo') {
    const h = src.hash ? `&h=${encodeURIComponent(src.hash)}` : '';
    return { url: `https://player.vimeo.com/video/${src.videoId}?title=0&byline=0&portrait=0${h}`, expiresAt: null };
  }

  const base = `https://iframe.mediadelivery.net/embed/${src.libraryId}/${src.videoId}`;
  const params = new URLSearchParams({ autoplay: 'false', preload: 'true', responsive: 'true' });
  const key = process.env.BUNNY_STREAM_TOKEN_KEY;
  if (!key) {
    if (!warnedUnsigned) {
      console.warn('[VIDEO] BUNNY_STREAM_TOKEN_KEY is not set: Bunny player links are unsigned.');
      warnedUnsigned = true;
    }
    return { url: `${base}?${params}`, expiresAt: null };
  }
  const expires = Math.floor(now / 1000) + PLAYER_LINK_TTL_SECONDS;
  params.set('token', createHash('sha256').update(key + src.videoId + expires).digest('hex'));
  params.set('expires', String(expires));
  return { url: `${base}?${params}`, expiresAt: expires * 1000 };
}
