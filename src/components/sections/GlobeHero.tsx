/**
 * GlobeHero — the hero section.
 *
 * Server rendered on purpose: the headline, tagline and sub-copy are in the
 * HTML, so they are the LCP element and are visible to crawlers. Only the
 * <Canvas> underneath is client-only.
 *
 * Layers, back to front: aurora glow → WebGL globe → perspective grid floor →
 * copy. The 3 "what we do" chips that used to float here (absolutely
 * positioned, overlapping the globe) moved to their own ServiceHighlights
 * section right after this one, by request — the hero now carries only the
 * headline/CTAs, no card content layered on top of it.
 */
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import { ArrowRight } from 'lucide-react';
import GlobeHeroScene from './GlobeHeroCanvasLazy';
import { HeroNetwork } from './HeroNetwork';
import { EmergingWordmark } from './EmergingWordmark';
import { DecodeText } from '@/components/ui/DecodeText';
import { HeroVideo } from './HeroVideo';

export async function GlobeHero() {
  const t = await getTranslations('hero');
  const a = await getTranslations('a11y');
  return (
    <section
      id="top"
      aria-labelledby="hero-heading"
      className="relative -mt-16 flex min-h-screen items-center justify-center overflow-hidden px-6 pb-24 pt-40"
    >
      {/* Dark cinematic base — sits behind everything so the hero reads dark
          and the video's highlights glow. Only this first section is dark;
          the rest of the page keeps the light canvas. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            'radial-gradient(120% 100% at 50% 12%, #071528 0%, #030b16 48%, #010305 100%)',
        }}
      />

      {/* Aurora behind the globe */}
      <div
        aria-hidden
        className="fl-aurora pointer-events-none absolute left-1/2 top-1/2 h-[680px] w-[680px] -translate-x-1/2 -translate-y-1/2 rounded-full motion-safe:animate-orbit-spin"
      />

      {/* WebGL globe hologram — client only, never mounts under reduced
          motion. Wrapped in the same centre-fade mask as the plexus so it
          fades out behind the robot's column and reads as sitting behind the
          figure (visible around the edges), not over it. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-20"
        style={{
          // NOTE: no CSS filter here. brightness/saturate/drop-shadow over a
          // live WebGL canvas re-filters the whole layer every animation
          // frame and was a major FPS cost — the neon glow is carried by the
          // scene itself and the network sprites, not a wrapper filter.
          // Wrapper opacity is 20% (by request) so the hologram sits as a
          // subtle layer behind the robot rather than competing with it.
          // Fade the hologram out over the robot's centre column so it reads
          // as sitting BEHIND the figure (visible around the edges), not over.
          maskImage:
            'radial-gradient(ellipse 38% 78% at 50% 45%, transparent 30%, rgba(0,0,0,0.55) 60%, #000 82%)',
          WebkitMaskImage:
            'radial-gradient(ellipse 38% 78% at 50% 45%, transparent 30%, rgba(0,0,0,0.55) 60%, #000 82%)',
        }}
      >
        <GlobeHeroScene />
      </div>

      {/* Glowing cyan/blue network plexus — animated canvas, sits BEHIND the
          video (no z, so under the z-[1] video) so it reads around and behind
          the robot. A real continuous animation, not an image. */}
      <HeroNetwork />

      {/* Cinematic hero video — the robot raises his open palm (~7s in) and
          blue/cyan light rays + particles pour out of it, from which the
          wordmark forms (see EmergingWordmark). Plays once and freezes on the
          open-palm frame — no loop, so there is no jarring jump-cut back to
          the start, and the hand holds still while the light plays out.
          mix-blend-lighten keeps the robot/scene solid while the neon network
          behind glows through the night sky. */}
      <HeroVideo className="pointer-events-none absolute inset-0 z-[1] h-full w-full object-cover mix-blend-lighten opacity-30" />

      {/* Perspective grid floor */}
      <div
        aria-hidden
        className="fl-grid-floor pointer-events-none absolute inset-x-[-22%] bottom-0 h-[44%]"
      />

      {/* Copy */}
      <div className="relative z-10 flex flex-col items-center text-center">
        <p className="fl-glass-strong mb-7 inline-flex items-center gap-2.5 rounded-pill px-4 py-2 font-display text-[0.8rem] font-semibold uppercase tracking-[0.14em] text-navy fl-elev-1">
          <span className="h-1.5 w-1.5 rounded-full bg-teal motion-safe:animate-pulse-ring" />
          {t('eyebrow')}
        </p>

        <h1
          id="hero-heading"
          className="mb-3 font-display text-[clamp(3.5rem,12vw,8.5rem)] font-bold leading-[0.95] tracking-[-0.04em]"
        >
          <EmergingWordmark
            text="FutureLine"
            className="fl-text-sweep drop-shadow-[0_0_28px_rgba(86,189,249,0.45)]"
          />
        </h1>

        <DecodeText
          text={t('tagline')}
          className="mb-6 font-display text-[clamp(0.9rem,2vw,1.25rem)] font-semibold tracking-[0.4em] text-[#7cc9f8]"
        />

        <p className="mb-9 max-w-xl text-lg leading-relaxed text-white/75">{t('lede')}</p>

        {/* The "Get an AI readiness assessment" primary CTA used to sit
            here, linking to the #audit section. Moved to /get-started by
            request — the readiness assessment is offered there now, and
            this hero keeps a single CTA into that flow. The #audit
            section itself still exists at the bottom of this page and is
            still reachable (header CTA, footer link, /audit route). */}
        <div className="flex flex-col gap-3 sm:flex-row">
          <Link
            href="/get-started"
            className="group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-pill bg-gradient-to-r from-navy via-teal to-mint px-7 py-3.5 font-display text-base font-semibold text-white shadow-[0_10px_24px_-8px_rgba(24,169,153,0.5)] transition-transform duration-300 hover:-translate-y-0.5"
            data-cursor="magnetic"
          >
            {t('secondaryCta')}
            <ArrowRight
              size={18}
              className="transition-transform duration-300 group-hover:translate-x-1 rtl:rotate-180 rtl:group-hover:-translate-x-1"
              aria-hidden
            />
            <span
              aria-hidden
              className="absolute inset-y-0 left-[-70%] w-[45%] -skew-x-12 bg-gradient-to-r from-transparent via-white/45 to-transparent motion-safe:animate-sheen"
            />
          </Link>
        </div>
      </div>

      {/* Scroll cue — used to scroll to the #services section on this page;
          that section (ThreePillars) moved to /get-started, so this is now
          a real link there instead of an in-page anchor. */}
      <Link
        href="/get-started"
        aria-label={a('seeOffer')}
        className="absolute bottom-6 left-1/2 z-10 flex h-10 w-6 -translate-x-1/2 justify-center rounded-pill border-[1.6px] border-white/30"
      >
        <span
          aria-hidden
          className="mt-1.5 h-2 w-1 rounded-pill bg-teal motion-safe:animate-cue-drop"
        />
      </Link>
    </section>
  );
}
