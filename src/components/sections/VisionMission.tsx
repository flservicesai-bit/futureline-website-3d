/**
 * VisionMission — pinned scrub carrying the company's vision and mission.
 *
 * Choreography, in scroll order:
 *   1. "OUR VISION" arrives oversized and settles into place
 *   2. the vision statement resolves word by word out of blur
 *   3. vision lifts away, "OUR MISSION" arrives oversized and settles
 *   4. the mission reveals as a reading scrub — each word lights from ghost
 *      grey to full navy, with the current word tinted teal
 *
 * The oversized-arrival applies to the *headings only*; the statements
 * themselves never scale.
 *
 * Words are rendered as JSX rather than the prototype's runtime textContent
 * surgery. That keeps the real sentences in the server HTML, leaves them
 * selectable, and means a screen reader reads one continuous sentence.
 *
 * Painting is driven from ScrollTrigger's onProgress, not a frame loop —
 * there is no canvas here, and copy must never depend on one.
 */
'use client';

import { useRef } from 'react';
import { useTranslations } from 'next-intl';
import { useSectionProgress } from '@/hooks/useSectionProgress';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';

const smooth = (p: number, a: number, b: number) => {
  const t = Math.min(1, Math.max(0, (p - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

export function VisionMission() {
  const t = useTranslations('visionMission');
  const VISION_EN = t('vision');
  const MISSION_EN = t('mission');
  const sectionRef = useRef<HTMLElement>(null);
  const visionKickerRef = useRef<HTMLParagraphElement>(null);
  const missionKickerRef = useRef<HTMLParagraphElement>(null);
  const visionStageRef = useRef<HTMLDivElement>(null);
  const missionStageRef = useRef<HTMLDivElement>(null);
  const visionWordRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const missionWordRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const reduced = usePrefersReducedMotion();

  const visionWords = VISION_EN.split(' ');
  const missionWords = MISSION_EN.split(' ');

  const paint = (p: number) => {
    // "OUR VISION" — oversized arrival, settling into place.
    const vkSettle = smooth(p, 0.02, 0.14);
    if (visionKickerRef.current) {
      visionKickerRef.current.style.opacity = smooth(p, 0.01, 0.06).toFixed(3);
      visionKickerRef.current.style.transform = `scale(${(1 + (1 - vkSettle) * 2.4).toFixed(4)})`;
    }

    // Vision words resolve out of blur once the heading has landed.
    visionWordRefs.current.forEach((el, i) => {
      if (!el) return;
      const a = 0.14 + (i / visionWords.length) * 0.18;
      const t = smooth(p, a, a + 0.06);
      el.style.opacity = t.toFixed(3);
      el.style.transform = `translateY(${((1 - t) * 26).toFixed(1)}px)`;
      el.style.filter = `blur(${((1 - t) * 10).toFixed(1)}px)`;
    });

    // Crossfade the two statements.
    const out = smooth(p, 0.46, 0.56);
    if (visionStageRef.current) {
      visionStageRef.current.style.opacity = (1 - out).toFixed(3);
      visionStageRef.current.style.transform = `translate(-50%, calc(-50% - ${(out * 44).toFixed(1)}px))`;
    }
    const inn = smooth(p, 0.52, 0.6);
    if (missionStageRef.current) {
      missionStageRef.current.style.opacity = inn.toFixed(3);
      missionStageRef.current.style.transform = `translate(-50%, calc(-50% + ${((1 - inn) * 44).toFixed(1)}px))`;
    }

    // "OUR MISSION" — same oversized arrival.
    const mkSettle = smooth(p, 0.56, 0.68);
    if (missionKickerRef.current) {
      missionKickerRef.current.style.opacity = smooth(p, 0.54, 0.6).toFixed(3);
      missionKickerRef.current.style.transform = `scale(${(1 + (1 - mkSettle) * 2.4).toFixed(4)})`;
    }

    // Reading scrub: words light in sequence, the leading edge tinted teal.
    missionWordRefs.current.forEach((el, i) => {
      if (!el) return;
      const a = 0.68 + (i / missionWords.length) * 0.26;
      const t = smooth(p, a, a + 0.03);
      el.style.opacity = (0.13 + t * 0.87).toFixed(3);
      el.style.color = t > 0.01 && t < 0.99 ? 'var(--fl-reading-edge)' : '';
    });
  };

  useSectionProgress(sectionRef, { end: '+=240%', onProgress: paint });

  // Reduced motion: both statements plainly stacked, nothing pinned.
  if (reduced) {
    return (
      <section
        ref={sectionRef}
        id="vision"
        aria-labelledby="vision-heading"
        className="relative py-20 md:py-28"
      >
        <div className="mx-auto max-w-3xl space-y-14 px-6 text-center">
          <div>
            <p className="mb-4 font-display text-sm font-semibold uppercase tracking-[0.32em] text-teal-ink">
              {t('visionKicker')}
            </p>
            <h2
              id="vision-heading"
              className="mb-4 font-display text-4xl font-bold tracking-tight text-navy md:text-5xl"
            >
              {VISION_EN}
            </h2>
          </div>
          <div>
            <p className="mb-4 font-display text-sm font-semibold uppercase tracking-[0.32em] text-teal-ink">
              {t('missionKicker')}
            </p>
            <p className="font-display text-2xl font-semibold leading-relaxed text-navy">
              {MISSION_EN}
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section
      ref={sectionRef}
      id="vision"
      aria-labelledby="vision-heading"
      className="relative flex h-screen w-full items-center justify-center overflow-hidden"
      style={{ ['--fl-reading-edge' as string]: '#1466DE' }}
    >
      <div
        aria-hidden
        className="fl-aurora pointer-events-none absolute left-1/2 top-1/2 h-[620px] w-[620px] -translate-x-1/2 -translate-y-1/2 rounded-full motion-safe:animate-orbit-spin-slow"
      />

      {/* Vision */}
      <div
        ref={visionStageRef}
        className="absolute left-1/2 top-1/2 w-[min(780px,90vw)] -translate-x-1/2 -translate-y-1/2 px-6 text-center"
      >
        <p
          ref={visionKickerRef}
          className="mb-4 inline-block font-display text-sm font-semibold uppercase tracking-[0.32em] text-teal-ink opacity-0"
        >
          {t('visionKicker')}
        </p>
        <h2
          id="vision-heading"
          className="mb-4 font-display text-[clamp(2.6rem,6.4vw,4.8rem)] font-bold leading-[1.12] tracking-[-0.03em] text-navy"
        >
          {visionWords.map((word, i) => (
            <span
              key={`${word}-${i}`}
              ref={(el) => {
                visionWordRefs.current[i] = el;
              }}
              className="inline-block opacity-0"
            >
              {word}
              {i < visionWords.length - 1 ? ' ' : ''}
            </span>
          ))}
        </h2>
      </div>

      {/* Mission */}
      <div
        ref={missionStageRef}
        className="absolute left-1/2 top-1/2 w-[min(780px,90vw)] -translate-x-1/2 -translate-y-1/2 px-6 text-center opacity-0"
      >
        <p
          ref={missionKickerRef}
          className="mb-4 inline-block font-display text-sm font-semibold uppercase tracking-[0.32em] text-teal-ink opacity-0"
        >
          {t('missionKicker')}
        </p>
        <p className="font-display text-[clamp(1.45rem,3.1vw,2.25rem)] font-semibold leading-[1.5] tracking-[-0.01em] text-navy">
          {missionWords.map((word, i) => (
            <span
              key={`${word}-${i}`}
              ref={(el) => {
                missionWordRefs.current[i] = el;
              }}
              className="inline-block opacity-[0.13]"
            >
              {word}
              {i < missionWords.length - 1 ? ' ' : ''}
            </span>
          ))}
        </p>
      </div>
    </section>
  );
}
