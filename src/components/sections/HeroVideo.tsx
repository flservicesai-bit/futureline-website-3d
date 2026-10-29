'use client';

import { useEffect, useRef } from 'react';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';

/**
 * The home hero's background video. Phones get a 640px encode (~190 KB),
 * larger screens 1280px (~830 KB); it sits at 30% opacity, so the 1080p
 * original (3.7 MB) bought nothing. Nothing downloads until it plays, and
 * under reduced motion it never plays: the poster frame stays.
 */
export function HeroVideo({ className }: { className: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  const reduced = usePrefersReducedMotion();

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    // Read the media query directly too: on the first pass after hydration
    // the hook still reports the server value.
    if (reduced || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      video.pause();
      return;
    }
    video.play().catch(() => {
      /* autoplay refused (e.g. data saver): the poster stays */
    });
  }, [reduced]);

  return (
    <video
      ref={ref}
      aria-hidden
      muted
      playsInline
      preload="none"
      poster="/hero/hero-poster.jpg"
      className={className}
    >
      {/* Browsers that ignore `media` take the first source, the small one. */}
      <source src="/hero/hero-640.mp4" type="video/mp4" media="(max-width: 767px)" />
      <source src="/hero/hero-1280.mp4" type="video/mp4" />
    </video>
  );
}
