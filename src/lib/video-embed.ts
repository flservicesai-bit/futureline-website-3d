/**
 * The embeddable player URL for a course's marketing video, or null.
 *
 * Only YouTube and Vimeo: the Content-Security-Policy (src/middleware.ts)
 * allows frames from those two alone, so any other link would render as an
 * empty, blocked frame. Callers show the course image instead.
 */
export function videoEmbedUrl(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return null;
  }
  const host = url.hostname.replace(/^www\.|^m\./, '');
  const id = (s: string | null | undefined) => (s && /^[\w-]{6,20}$/.test(s) ? s : null);

  if (host === 'youtu.be') {
    const v = id(url.pathname.split('/')[1]);
    return v ? `https://www.youtube.com/embed/${v}` : null;
  }
  if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
    const [, kind, rest] = url.pathname.split('/');
    const v = id(kind === 'watch' ? url.searchParams.get('v') : ['embed', 'shorts', 'live'].includes(kind) ? rest : null);
    return v ? `https://www.youtube.com/embed/${v}` : null;
  }
  if (host === 'vimeo.com' || host === 'player.vimeo.com') {
    const v = url.pathname.match(/(\d{6,})/)?.[1];
    return v ? `https://player.vimeo.com/video/${v}` : null;
  }
  return null;
}
