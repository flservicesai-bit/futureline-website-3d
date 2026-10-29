'use client';
import { useEffect, useRef, useState } from 'react';

/**
 * A course image laid over its generated cover. If the image fails to load
 * (the link is wrong or the file was never uploaded) it removes itself and
 * the cover underneath shows instead of a broken-image icon.
 */
export function CoverImage({ src, className = '' }: { src: string; className?: string }) {
  const ref = useRef<HTMLImageElement>(null);
  const [failed, setFailed] = useState(false);

  // An image that failed before hydration never fires onError for React.
  useEffect(() => {
    const img = ref.current;
    if (img?.complete && img.naturalWidth === 0) setFailed(true);
  }, []);

  if (failed) return null;
  return (
    // Course images come from any host an admin pastes, so a plain <img>
    // rather than next/image (which needs each host allowlisted).
    // eslint-disable-next-line @next/next/no-img-element
    <img
      ref={ref}
      src={src}
      alt=""
      loading="lazy"
      onError={() => setFailed(true)}
      className={`absolute inset-0 h-full w-full object-cover ${className}`}
    />
  );
}
