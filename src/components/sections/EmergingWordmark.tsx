/**
 * EmergingWordmark — the hero "FutureLine" wordmark, born from light rays
 * pouring out of the robot's open palm. No sphere, no orb: only rays,
 * glowing particles with light trails, and a soft glow on the hand.
 *
 * Sequence (synced to the hero video's story):
 *   1. The clip plays; the robot raises his open palm (~7s in). The video is
 *      FROZEN on that open-palm frame so the hand holds still while the
 *      light plays out of it.
 *   2. A soft glow blooms across the open palm and bright blue/cyan LIGHT
 *      RAYS emerge from its centre, spreading outward and reaching upward.
 *   3. Glowing PARTICLES stream out of the palm, each drawing an elegant
 *      light trail, and travel up toward the title line.
 *   4. From that light the letters materialize centre-outward (blur → sharp,
 *      drifting up), glowing sky-blue, then settle into the wordmark gradient
 *      and the existing light-sweep takes over.
 *
 * Fallbacks: if the video can't autoplay or never reaches the trigger time,
 * the effect fires anyway after a grace period; under prefers-reduced-motion
 * the letters simply appear and the video still freezes on the palm frame.
 *
 * The overlay is appended to the hero section (position:absolute inset-0)
 * so the light can travel from the hand up to the headline across the whole
 * section. Everything is aria-hidden except the wrapper, which carries the
 * accessible name. Purely additive — the robot, background, camera and layout
 * are untouched.
 */
'use client';

import { useEffect, useRef } from 'react';
import gsap from 'gsap';

/** Palm position (where the light originates) as a fraction of the hero. */
const EMITTER = { x: 0.45, y: 0.72 };
/** Video time (s) to freeze on: robot's open, raised palm. */
const FREEZE_TIME = 7.0;
/** If autoplay is blocked or video stalls, fire anyway after this long. */
const FALLBACK_MS = 9_500;
const AUTOPLAY_CHECK_MS = 2_500;

/** Cream palette with one coral glint (RGB triplets) for rays, particles and trails. */
const COLORS = ['244,237,224', '255,250,243', '244,237,224', '255,170,158'];

export function EmergingWordmark({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  const wrapRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;

    const letters = Array.from(wrap.querySelectorAll<HTMLSpanElement>('[data-letter]'));
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const hero = wrap.closest('section');
    const video = hero?.querySelector('video') ?? null;

    // Freeze the clip on the open-palm frame so the hand holds still while
    // the light emerges and the wordmark forms. Applies in every mode.
    const onFreezeTime = () => {
      if (video && video.currentTime >= FREEZE_TIME) {
        video.pause();
        startFx();
      }
    };

    let started = false;
    let overlay: HTMLDivElement | null = null;
    let tl: gsap.core.Timeline | null = null;
    const timers: number[] = [];

    const startFx = () => {
      if (started || !hero) return;
      started = true;

      if (reduced) {
        letters.forEach((l) => l.removeAttribute('style'));
        return;
      }

      const heroRect = hero.getBoundingClientRect();
      const ex = heroRect.width * EMITTER.x;
      const ey = heroRect.height * EMITTER.y;

      overlay = document.createElement('div');
      overlay.setAttribute('aria-hidden', 'true');
      overlay.style.cssText =
        'position:absolute;inset:0;z-index:5;pointer-events:none;overflow:hidden;';
      hero.appendChild(overlay);

      // 1 — a soft, wide glow on the open palm (a glow on the hand, NOT a
      // ball): flat, wider than tall, heavily blurred, and it fades away.
      const palmGlow = document.createElement('div');
      palmGlow.style.cssText = `position:absolute;left:${ex}px;top:${ey}px;width:150px;height:78px;margin:-39px 0 0 -75px;border-radius:9999px;background:radial-gradient(ellipse at center,rgba(255,250,243,0.9) 0%,rgba(244,237,224,0.45) 40%,rgba(244,237,224,0) 72%);filter:blur(6px);opacity:0;will-change:transform,opacity;`;
      overlay.appendChild(palmGlow);

      // 2 — light rays fanning out of the palm centre. Longest straight up
      // (toward the title), shorter to the sides so they read as "spreading
      // outward" from the hand. Anchored at the palm, grown with scaleY.
      const rays: HTMLDivElement[] = [];
      const RAY_COUNT = 18;
      for (let i = 0; i < RAY_COUNT; i++) {
        const angle = -82 + (164 / (RAY_COUNT - 1)) * i; // −82°..82°, 0 = up
        const rad = (angle * Math.PI) / 180;
        const len = ey * (0.32 + 0.6 * Math.cos(rad)) * (0.9 + Math.random() * 0.2);
        const col = COLORS[i % COLORS.length];
        const w = i % 3 === 0 ? 2.4 : 1.2;
        const f = document.createElement('div');
        f.style.cssText = `position:absolute;left:${ex}px;top:${ey - len}px;height:${len}px;width:${w}px;margin-left:${-w / 2}px;background:linear-gradient(to top,rgba(${col},0.95),rgba(${col},0));box-shadow:0 0 9px 1px rgba(${col},0.5);transform-origin:bottom center;transform:rotate(${angle}deg) scaleY(0);opacity:0;will-change:transform,opacity;`;
        overlay.appendChild(f);
        rays.push(f);
      }

      // Particle targets: spread across the wordmark's letters.
      const targets = letters.map((l) => {
        const r = l.getBoundingClientRect();
        return {
          x: r.left - heroRect.left + r.width / 2,
          y: r.top - heroRect.top + r.height * 0.75,
        };
      });

      // 3 — glowing particles, each with a soft light trail hanging below it,
      // so as they rise from the palm they draw elegant streaks of light.
      const particles: HTMLDivElement[] = [];
      const COUNT = 40;
      for (let i = 0; i < COUNT; i++) {
        const col = COLORS[i % COLORS.length];
        const s = 2.5 + Math.random() * 4;
        const trailLen = 16 + Math.random() * 26;
        const p = document.createElement('div');
        p.style.cssText = `position:absolute;left:0;top:0;width:${s}px;height:${s}px;border-radius:9999px;background:rgba(255,250,243,0.98);box-shadow:0 0 ${7 + s * 2}px ${1 + s / 2}px rgba(${col},0.85);opacity:0;will-change:transform,opacity;`;
        const trail = document.createElement('div');
        trail.style.cssText = `position:absolute;left:50%;top:${s}px;width:${Math.max(1.3, s * 0.4)}px;height:${trailLen}px;margin-left:${-Math.max(1.3, s * 0.4) / 2}px;background:linear-gradient(to bottom,rgba(${col},0.6),rgba(${col},0));border-radius:9999px;filter:blur(0.6px);`;
        p.appendChild(trail);
        overlay.appendChild(p);
        particles.push(p);
      }

      tl = gsap.timeline();
      // Non-null alias for use inside the forEach callbacks below: TypeScript
      // can't narrow the outer `tl` (declared `Timeline | null`) through a
      // closure, even though these callbacks run synchronously right here.
      const timeline = tl;

      // 1 — palm glow blooms, then fades as the light streams out of it.
      tl.fromTo(
        palmGlow,
        { opacity: 0, scale: 0.5 },
        { opacity: 0.85, scale: 1, duration: 0.35, ease: 'power2.out' },
        0,
      ).to(palmGlow, { opacity: 0, scale: 1.25, duration: 0.95, ease: 'power2.in' }, 0.7);

      // 2 — rays shoot out of the palm, centre first, then fade so they never
      // linger over the finished wordmark.
      rays.forEach((f, i) => {
        const centre = Math.abs(i - (RAY_COUNT - 1) / 2) / ((RAY_COUNT - 1) / 2);
        const delay = 0.12 + centre * 0.28 + Math.random() * 0.06;
        timeline.to(
          f,
          { scaleY: 1, opacity: 0.9, duration: 0.55, ease: 'power3.out' },
          delay,
        ).to(f, { opacity: 0, duration: 0.7, ease: 'power1.in' }, delay + 0.7);
      });

      // 3 — particles ride the light up to the letters, trails streaming.
      particles.forEach((p, i) => {
        const t = targets[i % targets.length];
        const jx = (Math.random() - 0.5) * 44;
        const midX = ex + (t.x - ex) * 0.5 + (Math.random() - 0.5) * 90;
        const midY = ey + (t.y - ey) * 0.5 - 24 - Math.random() * 55;
        const d = 0.8 + Math.random() * 0.55;
        const delay = 0.5 + Math.random() * 0.6;
        timeline.fromTo(
          p,
          { x: ex, y: ey, opacity: 0, scale: 0.6 },
          {
            keyframes: [
              { x: midX, y: midY, opacity: 1, scale: 1, duration: d * 0.55, ease: 'power1.out' },
              { x: t.x + jx, y: t.y, opacity: 0, scale: 0.3, duration: d * 0.45, ease: 'power1.in' },
            ],
          },
          delay,
        );
      });

      // 4 — letters materialize centre-outward. While animating, each letter
      // paints its own glowing colour (transforms/filters on the letters
      // block the parent's background-clip:text gradient from painting).
      tl.to(
        letters,
        {
          opacity: 1,
          y: 0,
          scale: 1,
          filter: 'blur(0px)',
          duration: 0.85,
          ease: 'power3.out',
          stagger: { each: 0.07, from: 'center' },
        },
        1.05,
      );
      // Settle from the emergence glow toward the gradient's cream…
      tl.to(letters, { color: 'rgb(244,237,224)', textShadow: '0 0 0 rgba(0,0,0,0)', duration: 0.45 }, '>-0.15');
      // …then hand off to the parent's gradient/light-sweep: clearing every
      // inline prop removes the transform/filter stacking contexts and the
      // explicit colour, so the clipped gradient takes over seamlessly.
      tl.call(() => {
        letters.forEach((l) => l.removeAttribute('style'));
      });
    };

    if (video) {
      video.addEventListener('timeupdate', onFreezeTime);
      video.addEventListener('ended', startFx);
      timers.push(
        window.setTimeout(() => {
          if (video.paused || video.currentTime < 0.5) startFx();
        }, AUTOPLAY_CHECK_MS),
      );
    }
    timers.push(window.setTimeout(startFx, video ? FALLBACK_MS : 600));

    return () => {
      timers.forEach(clearTimeout);
      if (video) {
        video.removeEventListener('timeupdate', onFreezeTime);
        video.removeEventListener('ended', startFx);
      }
      tl?.kill();
      overlay?.remove();
    };
  }, []);

  return (
    // dir="ltr" is required: the wordmark is rendered as one inline-block span
    // per letter, and inside the Arabic (RTL) layout those spans lay out
    // right-to-left, printing the brand name backwards ("eniLerutuF").
    // "FutureLine" is a Latin brand name and always reads left-to-right.
    <span ref={wrapRef} dir="ltr" className={className} aria-label={text} role="text">
      {Array.from(text).map((ch, i) => (
        <span
          key={i}
          data-letter
          aria-hidden="true"
          className="inline-block"
          style={{
            opacity: 0,
            transform: 'translateY(22px) scale(0.92)',
            filter: 'blur(12px)',
            color: 'rgb(255,250,243)',
            textShadow: '0 0 18px rgba(244,237,224,0.7)',
            willChange: 'transform, opacity, filter',
          }}
        >
          {ch}
        </span>
      ))}
    </span>
  );
}
