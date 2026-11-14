/**
 * Lesson video links: which host a saved link points at, and the form it is
 * stored in. Plain string handling, so the lesson forms can use it in the
 * browser too; the player link itself is built and signed on the server
 * (lib/video-player.ts).
 *
 * Bunny Stream is the host for paid lessons. Its player only plays on the
 * library's allowed domains and, with embed token authentication on, only
 * from a link the server signed moments ago, so a copied link stops working.
 * YouTube and Vimeo still work for free or public videos.
 */
export type VideoSource =
  | { provider: 'bunny'; libraryId: string; videoId: string }
  | { provider: 'youtube'; videoId: string }
  | { provider: 'vimeo'; videoId: string; hash: string | null };

const BUNNY_HOSTS = new Set(['iframe.mediadelivery.net', 'player.mediadelivery.net']);
const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const YOUTUBE_ID = /^[\w-]{11}$/;
const HAS_SCHEME = /^[a-z][a-z0-9+.-]*:/i;

/** The src of a pasted embed snippet (`<iframe src="…">`), or the text itself. */
export function extractEmbedSrc(value: string): string {
  const m = value.match(/<iframe[^>]*?\ssrc=["']([^"']+)["']/i);
  return (m ? m[1] : value).trim();
}

export function parseVideoSource(raw: string | null | undefined): VideoSource | null {
  if (!raw) return null;
  const text = extractEmbedSrc(raw);
  let url: URL;
  try {
    url = new URL(HAS_SCHEME.test(text) ? text : `https://${text}`);
  } catch {
    return null;
  }
  const host = url.hostname.toLowerCase().replace(/^www\.|^m\./, '');
  const parts = url.pathname.split('/').filter(Boolean);

  // Embed code and the dashboard's direct-play link: /embed|play/<library>/<video guid>
  if (BUNNY_HOSTS.has(host)) {
    const [kind, libraryId, videoId] = parts;
    if ((kind === 'embed' || kind === 'play') && /^\d+$/.test(libraryId ?? '') && GUID.test(videoId ?? '')) {
      return { provider: 'bunny', libraryId, videoId: videoId.toLowerCase() };
    }
    return null;
  }

  if (host === 'youtu.be') {
    const id = parts[0];
    return id && YOUTUBE_ID.test(id) ? { provider: 'youtube', videoId: id } : null;
  }
  if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
    const id = parts[0] === 'watch' ? url.searchParams.get('v') : ['embed', 'shorts', 'live', 'v'].includes(parts[0]) ? parts[1] : null;
    return id && YOUTUBE_ID.test(id) ? { provider: 'youtube', videoId: id } : null;
  }

  // vimeo.com/<id>, vimeo.com/<id>/<hash> (unlisted), player.vimeo.com/video/<id>?h=<hash>
  if (host === 'vimeo.com' || host === 'player.vimeo.com') {
    const i = parts.findIndex((p) => /^\d{6,}$/.test(p));
    if (i < 0) return null;
    const next = parts[i + 1];
    const hash = url.searchParams.get('h') ?? (next && /^[a-f0-9]{6,}$/i.test(next) ? next : null);
    return { provider: 'vimeo', videoId: parts[i], hash };
  }
  return null;
}

/**
 * How a lesson's video link is saved. Bunny links keep only the library and
 * video ids: a token pasted along with an embed code would have expired by
 * the time a learner opens the lesson. Anything else gets https:// when it
 * was typed without a scheme ("youtu.be/abc"): without it the URL check failed
 * and the builder threw away the whole lesson that had been typed.
 */
export function normalizeVideoUrl(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  const text = extractEmbedSrc(value);
  if (!text) return value;
  const src = parseVideoSource(text);
  if (src?.provider === 'bunny') return `https://iframe.mediadelivery.net/embed/${src.libraryId}/${src.videoId}`;
  return HAS_SCHEME.test(text) ? text : `https://${text}`;
}
