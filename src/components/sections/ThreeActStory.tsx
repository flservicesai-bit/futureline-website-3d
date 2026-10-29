/**
 * ThreeActStory — pinned, scroll-scrubbed section telling the three pillars
 * as a single continuous motion: advise → build → train.
 *
 * The section is one viewport tall and pinned by ScrollTrigger for three
 * further viewports of scroll. Note it is NOT a 400vh spacer with a sticky
 * child — that is how the prototype did it, but this repo pins with
 * ScrollTrigger (DualWalkway, NeuralPathway) and mixing the two approaches
 * would fight over the same scroll.
 *
 * Captions and headings are server rendered; only the canvas is client-only.
 * Under reduced motion nothing pins and the three acts render as a plain
 * stacked list.
 */
'use client';

import { useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useSectionProgress } from '@/hooks/useSectionProgress';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';
import ThreeActStoryScene from './ThreeActStoryCanvasLazy';

const ACT_KEYS = ['act1', 'act2', 'act3'] as const;
// The 4 service clusters. Order must match clusterPositions() in
// ThreeActStoryCanvas, which projects these labels from those hubs.
// (A 5th "Vision" pill was briefly added here and then removed by request.)
const LABEL_KEYS = ['consulting', 'applications', 'agents', 'training'] as const;


/** Caption visibility bands: [fadeInStart, fadeInEnd, fadeOutStart, fadeOutEnd]. */
const BANDS: [number, number, number, number][] = [
  [0.02, 0.1, 0.24, 0.32],
  [0.36, 0.44, 0.56, 0.64],
  [0.68, 0.76, 1.01, 1.02], // the last caption holds to the end
];

const smooth = (p: number, a: number, b: number) => {
  const t = Math.min(1, Math.max(0, (p - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

export function ThreeActStory() {
  const t = useTranslations('story');
  // Vision & Mission render as the capstone of the final act ("then we hand
  // you the keys") rather than as their own section below — by request. The
  // copy still comes from the visionMission namespace, unchanged.
  const tv = useTranslations('visionMission');
  const acts = ACT_KEYS.map((k) => ({
    key: k,
    kicker: t(`${k}.kicker`),
    title: t(`${k}.title`),
    body: t(`${k}.body`),
  }));
  const sectionRef = useRef<HTMLElement>(null);
  const captionRefs = useRef<(HTMLDivElement | null)[]>([]);
  const labelRefs = useRef<(HTMLElement | null)[]>([]);
  const railRef = useRef<HTMLSpanElement>(null);
  const reduced = usePrefersReducedMotion();
  const [, setActiveAct] = useState(0);

  const { progressRef } = useSectionProgress(sectionRef, {
    end: '+=300%',
    steps: ACT_KEYS.length,
    // Only fires when the index changes, so this is 3 renders for the whole
    // scrub rather than one per frame.
    onStep: setActiveAct,
    onProgress: (p) => paintDom(p),
  });

  // Caption opacity and the progress rail are written straight to the DOM.
  // Driven by ScrollTrigger (see onProgress below) rather than the canvas
  // frame loop, so the copy still appears when the scene is paused offscreen,
  // in a background tab, or has fallen back because WebGL is unavailable —
  // the text must never depend on the 3D rendering.
  const paintDom = (p: number) => {
    captionRefs.current.forEach((el, i) => {
      if (!el) return;
      const [inA, inB, outA, outB] = BANDS[i];
      const o = smooth(p, inA, inB) * (1 - smooth(p, outA, outB));
      el.style.opacity = o.toFixed(3);
      el.style.transform = `translate(-50%, calc(-50% + ${((1 - o) * 14).toFixed(1)}px))`;
    });
    if (railRef.current) railRef.current.style.transform = `scaleY(${p.toFixed(3)})`;
  };

  // Static fallback: no pin, no canvas, all three acts readable in flow.
  if (reduced) {
    return (
      <section
        ref={sectionRef}
        id="story"
        aria-labelledby="story-heading"
        className="relative py-20 md:py-28"
      >
        <h2 id="story-heading" className="sr-only">
          {t('heading')}
        </h2>
        <div className="mx-auto max-w-2xl space-y-14 px-6">
          {acts.map((act) => (
            <div key={act.key}>
              <p className="mb-3 font-display text-sm font-semibold uppercase tracking-[0.32em] text-teal-ink">
                {act.kicker}
              </p>
              <h3 className="mb-3 font-display text-3xl font-bold tracking-tight text-navy">
                {act.title}
              </h3>
              <p className="text-lg text-ink-muted">{act.body}</p>
            </div>
          ))}

          {/* Same Vision & Mission capstone as the scrubbed version. */}
          <div className="border-t border-hairline pt-10">
            <p className="mb-2 font-display text-sm font-semibold uppercase tracking-[0.32em] text-teal-ink">
              {tv('visionKicker')}
            </p>
            <p className="mb-6 font-display text-2xl font-bold leading-snug tracking-tight text-navy">
              {tv('vision')}
            </p>
            <p className="mb-2 font-display text-sm font-semibold uppercase tracking-[0.32em] text-teal-ink">
              {tv('missionKicker')}
            </p>
            <p className="text-lg leading-relaxed text-ink-muted">{tv('mission')}</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section
      ref={sectionRef}
      id="story"
      aria-labelledby="story-heading"
      className="relative flex h-screen w-full items-center justify-center overflow-hidden"
    >
      <h2 id="story-heading" className="sr-only">
        {t('heading')}
      </h2>

      <ThreeActStoryScene progressRef={progressRef} labelRefs={labelRefs} />

      {/* Cluster labels — projected each frame from the 3D hubs. The canvas
          offsets the top pair upward and the bottom pair downward, so all
          four sit at the constellation's edges and clear the centred
          caption (see the yOffset note in ThreeActStoryCanvas). */}
      <div aria-hidden className="pointer-events-none absolute inset-0 z-20">
        {LABEL_KEYS.map((labelKey, i) => (
          <span
            key={labelKey}
            ref={(el) => {
              labelRefs.current[i] = el;
            }}
            className="fl-glass-strong absolute left-0 top-0 whitespace-nowrap rounded-pill px-4 py-2 font-display text-sm font-semibold text-ink opacity-0 fl-elev-2"
          >
            {t(`labels.${labelKey}`)}
          </span>
        ))}
      </div>

      {/* Captions. Server rendered so the copy is crawlable even though the
          scrub controls their opacity. */}
      <div className="pointer-events-none relative z-20 w-full">
        {acts.map((act, i) => (
          <div
            key={act.key}
            ref={(el) => {
              captionRefs.current[i] = el;
            }}
            className="absolute left-1/2 top-1/2 w-[min(620px,88vw)] -translate-x-1/2 -translate-y-1/2 text-center opacity-0"
          >
            <p className="mb-3 font-display text-sm font-semibold uppercase tracking-[0.32em] text-teal-ink">
              {act.kicker}
            </p>
            <h3 className="mb-3 font-display text-[clamp(1.9rem,4.4vw,3.2rem)] font-bold leading-tight tracking-tight text-navy">
              {act.title}
            </h3>
            <p className="mx-auto max-w-[480px] text-lg text-ink-muted">{act.body}</p>
          </div>
        ))}
      </div>

      {/* Progress rail */}
      <div
        aria-hidden
        className="absolute end-6 top-1/2 z-20 h-32 w-[3px] -translate-y-1/2 overflow-hidden rounded-pill bg-navy/10"
      >
        <span
          ref={railRef}
          className="block h-full w-full origin-top rounded-pill bg-gradient-to-b from-teal to-mint"
          style={{ transform: 'scaleY(0)' }}
        />
      </div>
    </section>
  );
}
