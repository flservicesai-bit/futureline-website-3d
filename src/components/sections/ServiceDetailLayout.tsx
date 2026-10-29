/**
 * ServiceDetailLayout — shared editorial template for the 4 service detail pages.
 *
 * Each service page (digitalisation, custom-software, automations, consultation)
 * imports this layout and provides its own data. Keeps content in step with the
 * home-page design language (mono eyebrows, AnimatedText reveals, hairline
 * dividers, brand-teal accents) without 4× the duplication.
 */
'use client';

import { Link } from '@/i18n/routing';
import { useState, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { ChevronDown, Check, X, Layers } from 'lucide-react';
import { AnimatedText } from '@/components/ui/AnimatedText';
import { BrandedHeading } from '@/components/ui/BrandedHeading';
import { SectionEyebrow } from '@/components/ui/SectionEyebrow';
import { FadeUp } from '@/components/motion/FadeUp';
import { MarqueeStrip } from '@/components/ui/MarqueeStrip';
import { PageScrollSpy } from '@/components/ui/PageScrollSpy';
import { RecentBuildsGrid } from '@/components/ui/BuildMockup';

export interface ServiceDetailData {
  eyebrow: string; // e.g. "FL · Lab · Digitalisation"
  pageNumber: string; // e.g. "01"
  heading: string; // hero H1 (kept short — uses AnimatedText)
  subhead: string;
  marqueeItems: string[];
  painPoints: {
    stat: string;
    headline: string;
    body: string;
  }[];
  process: {
    when: string; // e.g. "Week 1"
    title: string;
    body: string;
  }[];
  /** Override the default "The cost of staying manual." pain H2.
   *  Defaults are digitalisation-flavored; each service page should
   *  name its own pain frame. */
  painHeading?: string;
  /** Override the default "Live in weeks." process H2 with something
   *  service-specific (e.g. "The 6–10 week build."). Falls back to the
   *  global promise when not set. */
  processHeading?: string;
  /** Override the default "Built to last." deliverables H2. */
  deliverablesHeading?: string;
  /** Override the default "What clients gain." stats H2. */
  statsHeading?: string;
  /** Override the default "Built for your industry." industries H2. */
  industriesHeading?: string;
  /** Override the default "Things we hear." FAQs H2. */
  faqsHeading?: string;
  /** Optional one-line callout below the process heading. Useful for
   *  highlighting an underrated process strength (e.g. "Working software
   *  every Friday — no long silences."). */
  processSubhead?: string;
  /** Optional tech-stack caption rendered below the process grid.
   *  Builds trust with technical buyers. */
  techStack?: string;
  /** Optional 3-way "Build vs Buy vs Hire" decision matrix. Renders
   *  between deliverables and compare. Different objection from compare
   *  (which is 2-way SaaS-vs-FL); this one addresses "why not hire?". */
  buildVsBuy?: {
    eyebrow?: string;
    headline: string;
    intro?: string;
    /** Column header overrides. Default to "Buy SaaS" / "Hire developer"
     *  but each service page can name its alternatives more precisely
     *  (e.g. Automations swaps to "Use Zapier/Make" / "Hire a developer"). */
    saasHeader?: string;
    hireHeader?: string;
    rows: {
      label: string;
      saas: string;
      hire: string;
      futureline: string;
    }[];
  };
  deliverables: string[];
  /** Optional "Recent builds" tile strip — stylized mockups of
   *  representative built systems. Provides visual proof on a page
   *  that's otherwise text-heavy. Renders after deliverables. */
  recentBuilds?: {
    eyebrow?: string;
    headline: string;
    intro?: string;
    tiles: {
      title: string;
      subtitle: string;
      industry: string;
      kind: 'dashboard' | 'mobile' | 'portal' | 'crm';
      /** Optional click-through detail — when present, the tile opens
       *  a modal with long-form marketing copy explaining how the
       *  build helps organizations. */
      detail?: {
        lead: string;
        whoItsFor: string;
        replaces: string;
        features: string[];
        results: string[];
      };
    }[];
  };
  /** Optional "What we do, what you do" commitment panel — sets
   *  expectations on client-side time investment. Addresses the
   *  unspoken buyer worry: "how much of my team's time will this
   *  consume?" Renders after the Build/Buy/Hire matrix. */
  commitment?: {
    eyebrow?: string;
    headline: string;
    intro?: string;
    weDo: string[];
    youDo: { item: string; time: string }[];
    /** Optional "Total ask" callout under the YOU column — a single
     *  honest hour total across the engagement. Renders as a footer
     *  panel highlight when present. */
    youDoTotal?: string;
  };
  industries?: {
    name: string;
    pain: string;
  }[];
  /**
   * Optional "Off-the-shelf vs. built for you" comparison block.
   * Renders between the deliverables and stats sections.
   */
  compare?: {
    eyebrow?: string;
    headline: string;
    intro?: string;
    leftHeader?: string;  // defaults to "Off-the-shelf SaaS"
    rightHeader?: string; // defaults to "FutureLine custom build"
    rows: { label: string; saas: string; futureline: string }[];
  };
  stats?: {
    value: string;
    label: string;
    sub: string;
  }[];
  faqs?: { q: string; a: string }[];
  cta?: {
    eyebrow?: string;
    headline: string;
    sub: string;
    primary: { label: string; href: string };
    secondary?: { label: string; href: string };
  };
}

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  const innerRef = useRef<HTMLDivElement>(null);
  return (
    <div className="border-t border-hairline">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="group flex w-full items-start justify-between gap-6 py-6 text-start"
        data-cursor="hover"
      >
        <span className="text-base font-medium leading-snug text-navy md:text-lg">{q}</span>
        <ChevronDown
          size={18}
          className="mt-1 flex-shrink-0 text-ink-muted transition-transform duration-300 group-hover:text-lab-ink"
          style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
        />
      </button>
      <div
        role="region"
        className="overflow-hidden transition-all duration-300 ease-in-out"
        style={{ maxHeight: open ? `${innerRef.current?.scrollHeight ?? 600}px` : '0px' }}
      >
        <div ref={innerRef}>
          <p className="pb-6 pe-12 text-sm leading-relaxed text-ink-muted md:text-base">{a}</p>
        </div>
      </div>
    </div>
  );
}

export function ServiceDetailLayout({ data }: { data: ServiceDetailData }) {
  const t = useTranslations('serviceDetail');

  // Sections list for the scroll-spy is built dynamically so optional
  // blocks (compare/stats/industries/faqs) only appear when present.
  const spySections = [
    { id: 'why-it-matters', label: t('spy.whyItMatters') },
    { id: 'how-we-work', label: t('spy.howWeWork') },
    { id: 'what-you-get', label: t('spy.whatYouGet') },
    ...(data.recentBuilds && data.recentBuilds.tiles.length > 0
      ? [{ id: 'recent-builds', label: t('spy.recentBuilds') }]
      : []),
    ...(data.buildVsBuy && data.buildVsBuy.rows.length > 0
      ? [{ id: 'build-buy-hire', label: t('spy.buildBuyHire') }]
      : []),
    ...(data.commitment
      ? [{ id: 'the-engagement', label: t('spy.theEngagement') }]
      : []),
    ...(data.compare && data.compare.rows.length > 0
      ? [{ id: 'why-not-saas', label: t('spy.whyNotSaas') }]
      : []),
    ...(data.stats && data.stats.length > 0
      ? [{ id: 'by-the-numbers', label: t('spy.byTheNumbers') }]
      : []),
    ...(data.industries && data.industries.length > 0
      ? [{ id: 'where-it-fits', label: t('spy.whereItFits') }]
      : []),
    ...(data.faqs && data.faqs.length > 0
      ? [{ id: 'common-questions', label: t('spy.commonQuestions') }]
      : []),
    { id: 'start', label: t('spy.start') },
  ];

  return (
    <main className="bg-canvas">
      <PageScrollSpy sections={spySections} />
      {/* ── Hero ── */}
      <section id="top" className="relative overflow-hidden border-b border-hairline">
        {/* HeroRibbon3D removed from this hero for now. Its Bloom +
            Vignette pipeline renders opaque and is tuned for a black page,
            so on the light canvas it reads as a grey slab rather than a
            ribbon. Making it work here is a design job (a light-appropriate
            postprocessing chain, or a different visual), not a colour swap —
            so the hero stands on its typography until that is done. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-r from-canvas via-canvas/85 to-transparent rtl:bg-gradient-to-l md:via-canvas/60"
        />
        {/* Huge faded page-number watermark — editorial layout cue,
            sits behind the hero text and the 3D ribbon. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 end-2 z-[2] hidden select-none items-center font-black tracking-tighter text-navy/[0.025] md:flex"
          style={{ fontSize: 'clamp(14rem, 26vw, 28rem)', lineHeight: 0.85 }}
        >
          {data.pageNumber}
        </div>

        <div className="relative z-10 mx-auto max-w-7xl px-4 py-24 sm:px-6 md:py-32 lg:px-8">
          <div className="grid grid-cols-1 items-center gap-12 md:grid-cols-12">
            <div className="md:col-span-7">
              <p className="mb-6 flex items-center gap-2 font-mono text-xs uppercase tracking-[0.4em] text-lab-ink">
                <span
                  aria-hidden="true"
                  className="block h-1.5 w-1.5 rounded-full bg-lab shadow-[0_0_10px_2px_rgba(24,169,153,0.55)]"
                />
                {data.eyebrow}
              </p>
              {/* Small page-number line removed — replaced by the big
                  faded watermark behind the hero. */}
              <BrandedHeading as="h1" size="xl">
                {data.heading}
              </BrandedHeading>
              <AnimatedText
                as="p"
                variant="words"
                className="mt-8 max-w-xl text-lg leading-relaxed text-ink md:text-xl"
                delay={0.2}
              >
                {data.subhead}
              </AnimatedText>
              <FadeUp delay={0.4}>
                <div className="mt-12 flex flex-wrap items-center gap-3">
                  <Link
                    href="/audit"
                    data-cursor="magnetic"
                    data-cursor-strength="22"
                    className="rounded-full bg-navy px-7 py-3 text-sm font-medium text-white transition-colors hover:bg-navy-light"
                  >
                    {t('heroAuditCta')}
                  </Link>
                  <Link
                    href="#how-we-work"
                    data-cursor="hover"
                    className="px-3 py-3 text-sm text-ink transition-colors hover:text-navy"
                  >
                    {t('heroSeeHow')}
                  </Link>
                </div>
              </FadeUp>
            </div>
          </div>
        </div>
      </section>

      <MarqueeStrip items={data.marqueeItems} speed={30} />

      {/* ── Pain points (numbered editorial rows) ── */}
      <section id="why-it-matters" className="scroll-mt-24 px-4 py-16 sm:px-6 md:py-20 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8 md:mb-12">
            <SectionEyebrow>{t('eyebrowWhyItMatters')}</SectionEyebrow>
            <BrandedHeading as="h2" size="lg">
              {data.painHeading ?? t('painHeadingDefault')}
            </BrandedHeading>
          </div>

          <div className="space-y-0">
            {data.painPoints.map((p, i) => (
              <article
                key={i}
                className="relative grid grid-cols-12 gap-6 border-t border-hairline py-8 md:gap-12 md:py-10"
              >
                <div className="col-span-12 md:col-span-3">
                  <p className="font-mono text-sm tracking-[0.3em] text-lab-ink">
                    {String(i + 1).padStart(2, '0')}
                  </p>
                  <p className="mt-3 text-3xl font-semibold tracking-tight text-navy md:text-4xl">
                    {p.stat}
                  </p>
                </div>
                <div className="col-span-12 md:col-span-9">
                  <AnimatedText
                    as="h3"
                    variant="chars"
                    className="text-3xl font-semibold leading-[1.05] tracking-[-0.01em] text-navy md:text-[clamp(1.75rem,3.5vw,3.25rem)]"
                  >
                    {p.headline}
                  </AnimatedText>
                  <AnimatedText
                    as="p"
                    variant="words"
                    className="mt-6 max-w-2xl text-base leading-relaxed text-ink-muted md:text-lg"
                    delay={0.1}
                  >
                    {p.body}
                  </AnimatedText>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ── Process / how we work ── */}
      <section id="how-we-work" className="scroll-mt-24 border-t border-hairline px-4 py-16 sm:px-6 md:py-20 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8 md:mb-12">
            <SectionEyebrow>{t('eyebrowHowWeWork')}</SectionEyebrow>
            <BrandedHeading as="h2" size="lg">
              {data.processHeading ?? t('processHeadingDefault')}
            </BrandedHeading>
            {data.processSubhead && (
              <AnimatedText
                as="p"
                variant="words"
                className="mt-6 max-w-2xl text-base leading-relaxed text-ink md:text-lg"
                delay={0.15}
              >
                {data.processSubhead}
              </AnimatedText>
            )}
          </div>

          <div className="grid grid-cols-1 gap-x-12 md:grid-cols-2 lg:grid-cols-4">
            {data.process.map((step, i) => (
              <FadeUp key={i} delay={i * 0.08}>
                <div className="border-t border-hairline py-8">
                  <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-lab-ink">
                    {step.when}
                  </p>
                  <h3 className="mt-5 text-2xl font-semibold tracking-[-0.01em] text-navy">
                    {String(i + 1).padStart(2, '0')} · {step.title}
                  </h3>
                  <p className="mt-4 text-sm leading-relaxed text-ink-muted">{step.body}</p>
                </div>
              </FadeUp>
            ))}
          </div>

          {data.techStack && (
            <div className="mt-9 border-t border-hairline pt-5 md:mt-10">
              <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1 font-mono text-[11px] uppercase tracking-[0.3em] text-ink-muted">
                <span className="text-lab-ink">{t('builtOn')}</span>
                <span className="text-ink normal-case tracking-normal">{data.techStack}</span>
              </p>
            </div>
          )}
        </div>
      </section>

      {/* ── Deliverables ── */}
      <section id="what-you-get" className="scroll-mt-24 border-t border-hairline px-4 py-16 sm:px-6 md:py-20 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="grid grid-cols-1 gap-10 md:grid-cols-12 md:gap-12">
            <div className="md:col-span-5">
              <SectionEyebrow>{t('eyebrowWhatYouGet')}</SectionEyebrow>
              <BrandedHeading as="h2" size="lg">
                {data.deliverablesHeading ?? t('deliverablesHeadingDefault')}
              </BrandedHeading>
              <p className="mt-8 max-w-md text-base leading-relaxed text-ink-muted md:text-lg">
                {t('deliverablesIntro')}
              </p>
            </div>
            <ul className="md:col-span-7">
              {data.deliverables.map((item, i) => (
                <li
                  key={i}
                  className="flex items-baseline gap-4 border-t border-hairline py-5 text-base text-ink md:text-lg"
                >
                  <span
                    aria-hidden
                    className="font-mono text-xs tracking-[0.3em] text-lab-ink"
                  >
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ── Recent builds (optional): visual proof strip ──
          Stylized mockups of representative built systems. Gives a
          text-heavy service page some visual weight. Renders after
          deliverables so the bullet list is immediately backed by
          "here's what each of those looks like." */}
      {data.recentBuilds && data.recentBuilds.tiles.length > 0 && (
        <section
          id="recent-builds"
          className="scroll-mt-24 border-t border-hairline px-4 py-16 sm:px-6 md:py-20 lg:px-8"
        >
          <div className="mx-auto max-w-7xl">
            <div className="mb-8 max-w-3xl md:mb-12">
              <SectionEyebrow>{data.recentBuilds.eyebrow ?? t('recentBuildsEyebrowDefault')}</SectionEyebrow>
              <BrandedHeading as="h2" size="lg">
                {data.recentBuilds.headline}
              </BrandedHeading>
              {data.recentBuilds.intro && (
                <AnimatedText
                  as="p"
                  variant="words"
                  className="mt-8 max-w-2xl text-base leading-relaxed text-ink-muted md:text-lg"
                  delay={0.15}
                >
                  {data.recentBuilds.intro}
                </AnimatedText>
              )}
            </div>

            <RecentBuildsGrid tiles={data.recentBuilds.tiles} />

            <p className="mt-6 text-center font-mono text-[10px] uppercase tracking-[0.3em] text-ink-muted md:mt-8">
              {t('recentBuildsDisclaimer')}
            </p>
          </div>
        </section>
      )}

      {/* ── Build vs Buy vs Hire (optional): 3-way decision matrix ──
          Different from compare (which is 2-way SaaS-vs-FL). Addresses
          the "why not hire a developer?" objection that compare can't. */}
      {data.buildVsBuy && data.buildVsBuy.rows.length > 0 && (
        <section
          id="build-buy-hire"
          className="scroll-mt-24 border-t border-hairline px-4 py-16 sm:px-6 md:py-20 lg:px-8"
        >
          <div className="mx-auto max-w-7xl">
            <div className="mb-8 max-w-3xl md:mb-12">
              <SectionEyebrow>{data.buildVsBuy.eyebrow ?? t('buildVsBuyEyebrowDefault')}</SectionEyebrow>
              <BrandedHeading as="h2" size="lg">
                {data.buildVsBuy.headline}
              </BrandedHeading>
              {data.buildVsBuy.intro && (
                <AnimatedText
                  as="p"
                  variant="words"
                  className="mt-8 max-w-2xl text-base leading-relaxed text-ink-muted md:text-lg"
                  delay={0.15}
                >
                  {data.buildVsBuy.intro}
                </AnimatedText>
              )}
            </div>

            <div className="overflow-hidden rounded-md border border-hairline bg-canvas-card">
              {/* Column headers — Category / SaaS / Hire / FutureLine */}
              <div className="sticky top-0 z-10 grid grid-cols-12 gap-3 border-b border-hairline bg-canvas-card px-5 py-5 backdrop-blur-md md:px-8 md:py-6">
                <div className="col-span-12 md:col-span-3">
                  <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-ink-muted">
                    {t('category')}
                  </p>
                </div>
                <div className="col-span-4 md:col-span-3">
                  <p className="flex items-center gap-2 text-sm font-semibold tracking-tight text-ink md:text-base">
                    <span aria-hidden className="inline-block h-1.5 w-1.5 rounded-full bg-canvas-card" />
                    {data.buildVsBuy.saasHeader ?? t('buildVsBuySaasDefault')}
                  </p>
                </div>
                <div className="col-span-4 md:col-span-3">
                  <p className="flex items-center gap-2 text-sm font-semibold tracking-tight text-ink md:text-base">
                    <span aria-hidden className="inline-block h-1.5 w-1.5 rounded-full bg-canvas-card" />
                    {data.buildVsBuy.hireHeader ?? t('buildVsBuyHireDefault')}
                  </p>
                </div>
                <div className="col-span-4 md:col-span-3">
                  <p
                    className="flex items-center gap-2 text-sm font-semibold tracking-tight text-navy md:text-base"
                    style={{ textShadow: '0 0 8px rgba(24,169,153,0.4)' }}
                  >
                    <span
                      aria-hidden
                      className="inline-block h-2 w-2 rounded-full bg-lab"
                      style={{ boxShadow: '0 0 8px rgba(24, 169, 153, 0.65)' }}
                    />
                    FutureLine
                  </p>
                </div>
              </div>

              {data.buildVsBuy.rows.map((row, i) => (
                <FadeUp key={i} delay={i * 0.05}>
                  <div className="grid grid-cols-12 items-start gap-3 border-b border-hairline px-5 py-6 last:border-b-0 md:gap-4 md:px-8 md:py-7">
                    <div className="col-span-12 md:col-span-3">
                      <div className="flex items-baseline gap-3">
                        <span aria-hidden className="font-mono text-[11px] tracking-[0.25em] text-lab-ink">
                          {String(i + 1).padStart(2, '0')}
                        </span>
                        <h4 className="text-base font-semibold tracking-tight text-navy md:text-lg">
                          {row.label}
                        </h4>
                      </div>
                    </div>
                    <div className="col-span-4 md:col-span-3">
                      <p className="text-sm leading-relaxed text-ink-muted md:text-base">{row.saas}</p>
                    </div>
                    <div className="col-span-4 md:col-span-3">
                      <p className="text-sm leading-relaxed text-ink-muted md:text-base">{row.hire}</p>
                    </div>
                    <div className="relative col-span-4 md:col-span-3">
                      <span
                        aria-hidden
                        className="absolute -start-3 top-1 hidden h-[calc(100%-0.5rem)] w-px bg-gradient-to-b from-lab/40 via-lab/15 to-transparent md:block"
                      />
                      <p className="text-sm font-medium leading-relaxed text-navy md:text-base">
                        {row.futureline}
                      </p>
                    </div>
                  </div>
                </FadeUp>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Commitment (optional): "What we do, what you do" ──
          Sets expectations on client-side time investment. Two side-
          by-side panels: FutureLine column lists what we own; client
          column lists time commitments with hour estimates. */}
      {data.commitment && (
        <section
          id="the-engagement"
          className="scroll-mt-24 border-t border-hairline px-4 py-16 sm:px-6 md:py-20 lg:px-8"
        >
          <div className="mx-auto max-w-7xl">
            <div className="mb-8 max-w-3xl md:mb-12">
              <SectionEyebrow>{data.commitment.eyebrow ?? t('commitmentEyebrowDefault')}</SectionEyebrow>
              <BrandedHeading as="h2" size="lg">
                {data.commitment.headline}
              </BrandedHeading>
              {data.commitment.intro && (
                <AnimatedText
                  as="p"
                  variant="words"
                  className="mt-8 max-w-2xl text-base leading-relaxed text-ink-muted md:text-lg"
                  delay={0.15}
                >
                  {data.commitment.intro}
                </AnimatedText>
              )}
            </div>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              {/* What we do */}
              <FadeUp>
                <div className="relative h-full overflow-hidden rounded-xl border border-lab/30 bg-lab/[0.04] p-7 md:p-9">
                  <span
                    aria-hidden
                    className="pointer-events-none absolute inset-x-0 top-0 h-px"
                    style={{
                      background:
                        'linear-gradient(90deg, transparent 0%, rgba(24,169,153,0.7) 50%, transparent 100%)',
                    }}
                  />
                  <div className="mb-6 flex items-center gap-3">
                    <span
                      aria-hidden
                      className="flex h-8 w-8 items-center justify-center rounded-full border border-lab/40 bg-lab/15 font-mono text-[10px] font-bold uppercase tracking-widest text-lab-ink"
                    >
                      FL
                    </span>
                    <p className="font-mono text-[11px] uppercase tracking-[0.32em] text-lab-ink">
                      {t('whatWeDo')}
                    </p>
                  </div>
                  <ul className="space-y-3.5">
                    {data.commitment.weDo.map((item, i) => (
                      <li
                        key={i}
                        className="flex items-baseline gap-3 text-base leading-relaxed text-ink md:text-lg"
                      >
                        <span
                          aria-hidden
                          className="font-mono text-[10px] tracking-[0.25em] text-lab-ink"
                        >
                          {String(i + 1).padStart(2, '0')}
                        </span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </FadeUp>

              {/* What you do */}
              <FadeUp delay={0.1}>
                <div className="relative h-full overflow-hidden rounded-xl border border-hairline bg-canvas-card p-7 md:p-9">
                  <span
                    aria-hidden
                    className="pointer-events-none absolute inset-x-0 top-0 h-px"
                    style={{
                      background:
                        'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.35) 50%, transparent 100%)',
                    }}
                  />
                  <div className="mb-6 flex items-center gap-3">
                    <span
                      aria-hidden
                      className="flex h-8 w-8 items-center justify-center rounded-full border border-hairline bg-canvas-card font-mono text-[10px] font-bold uppercase tracking-widest text-ink"
                    >
                      {t('youBadge')}
                    </span>
                    <p className="font-mono text-[11px] uppercase tracking-[0.32em] text-ink">
                      {t('whatYouDo')}
                    </p>
                  </div>
                  <ul className="space-y-4">
                    {data.commitment.youDo.map((entry, i) => (
                      <li key={i} className="border-t border-hairline pt-3 first:border-t-0 first:pt-0">
                        <p className="text-base font-medium leading-relaxed text-navy md:text-lg">
                          {entry.item}
                        </p>
                        <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.28em] text-ink-muted">
                          {entry.time}
                        </p>
                      </li>
                    ))}
                  </ul>
                  {data.commitment.youDoTotal && (
                    <div className="mt-7 border-t border-hairline pt-5">
                      <p className="font-mono text-[10px] uppercase tracking-[0.32em] text-ink-muted">
                        {t('totalAsk')}
                      </p>
                      <p className="mt-2 text-base font-semibold leading-snug text-navy md:text-lg">
                        {data.commitment.youDoTotal}
                      </p>
                    </div>
                  )}
                </div>
              </FadeUp>
            </div>
          </div>
        </section>
      )}

      {/* ── Compare (optional): "Off-the-shelf vs. built for you" ── */}
      {data.compare && data.compare.rows.length > 0 && (
        <section id="why-not-saas" className="scroll-mt-24 border-t border-hairline px-4 py-16 sm:px-6 md:py-20 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="mb-8 max-w-3xl md:mb-12">
              <SectionEyebrow>{data.compare.eyebrow ?? t('compareEyebrowDefault')}</SectionEyebrow>
              <BrandedHeading as="h2" size="lg">
                {data.compare.headline}
              </BrandedHeading>
              {data.compare.intro && (
                <AnimatedText
                  as="p"
                  variant="words"
                  className="mt-8 max-w-2xl text-base leading-relaxed text-ink-muted md:text-lg"
                  delay={0.15}
                >
                  {data.compare.intro}
                </AnimatedText>
              )}
            </div>

            {/* Compare grid — each row is a category, with the SaaS reality
                on the left (faded white, ❌) and the FutureLine outcome on
                the right (brand teal, ✓). */}
            <div className="overflow-hidden rounded-md border border-hairline bg-canvas-card">
              {/* Column headers — sticky on tall screens so the user always
                  knows which column is which while reading rows. */}
              <div className="sticky top-0 z-10 grid grid-cols-12 gap-4 border-b border-hairline bg-canvas-card px-6 py-6 backdrop-blur-md md:px-10 md:py-7">
                <div className="col-span-12 md:col-span-3">
                  <div className="flex items-center gap-3">
                    <span
                      aria-hidden
                      className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border border-hairline bg-canvas-card text-ink-muted"
                    >
                      <Layers size={15} strokeWidth={2} />
                    </span>
                    <p className="text-base font-semibold tracking-tight text-ink md:text-xl">
                      {t('category')}
                    </p>
                  </div>
                </div>
                <div className="col-span-6 md:col-span-4">
                  <div className="flex items-center gap-3">
                    <span
                      aria-hidden
                      className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border border-hairline bg-canvas-card text-ink-muted"
                    >
                      <X size={16} strokeWidth={2.5} />
                    </span>
                    <p className="text-base font-semibold tracking-tight text-ink md:text-xl">
                      {data.compare.leftHeader ?? t('compareLeftDefault')}
                    </p>
                  </div>
                </div>
                <div className="col-span-6 md:col-span-5">
                  <div className="flex items-center gap-3">
                    <span
                      aria-hidden
                      className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border border-lab/40 bg-lab/15 text-lab-ink"
                      style={{ boxShadow: '0 0 18px rgba(24, 169, 153, 0.4)' }}
                    >
                      <Check size={16} strokeWidth={2.5} />
                    </span>
                    <p className="text-base font-semibold tracking-tight text-navy md:text-xl">
                      {data.compare.rightHeader ?? t('compareRightDefault')}
                    </p>
                  </div>
                </div>
              </div>

              {/* Rows — category label is now prominent, numbered prefix
                  anchors the eye, FutureLine column gets a left teal hairline
                  so the "answer" column reads as the highlighted one. */}
              {data.compare.rows.map((row, i) => (
                <FadeUp key={i} delay={i * 0.05}>
                  <div className="grid grid-cols-12 items-start gap-4 border-b border-hairline px-6 py-7 last:border-b-0 md:px-10 md:py-9">
                    <div className="col-span-12 md:col-span-3">
                      <div className="flex items-baseline gap-3">
                        <span
                          aria-hidden
                          className="font-mono text-[11px] tracking-[0.25em] text-lab-ink"
                        >
                          {String(i + 1).padStart(2, '0')}
                        </span>
                        <h4 className="text-base font-semibold tracking-tight text-navy md:text-lg">
                          {row.label}
                        </h4>
                      </div>
                    </div>
                    <div className="col-span-6 md:col-span-4">
                      <p className="text-sm leading-relaxed text-ink-muted md:text-base">
                        {row.saas}
                      </p>
                    </div>
                    <div className="relative col-span-6 md:col-span-5">
                      <span
                        aria-hidden
                        className="absolute -start-4 top-1 hidden h-[calc(100%-0.5rem)] w-px bg-gradient-to-b from-lab/40 via-lab/15 to-transparent md:block"
                      />
                      <p className="text-sm font-medium leading-relaxed text-navy md:text-base">
                        {row.futureline}
                      </p>
                    </div>
                  </div>
                </FadeUp>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Stats (optional) ── */}
      {data.stats && data.stats.length > 0 && (
        <section id="by-the-numbers" className="scroll-mt-24 border-t border-hairline px-4 py-16 sm:px-6 md:py-20 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <SectionEyebrow>{t('eyebrowByTheNumbers')}</SectionEyebrow>
            <BrandedHeading as="h2" size="lg">
              {data.statsHeading ?? t('statsHeadingDefault')}
            </BrandedHeading>
            <div
              className={[
                'mt-12 grid grid-cols-1 gap-12 md:gap-8',
                data.stats.length === 4
                  ? 'md:grid-cols-2 lg:grid-cols-4'
                  : 'md:grid-cols-3',
              ].join(' ')}
            >
              {data.stats.map((s, i) => (
                <FadeUp key={i} delay={i * 0.08}>
                  <div className="border-t border-hairline pt-6">
                    <p className="text-6xl font-semibold tracking-tight text-navy md:text-7xl">
                      {s.value}
                    </p>
                    <p className="mt-3 text-sm font-medium uppercase tracking-[0.18em] text-ink">
                      {s.label}
                    </p>
                    <p className="mt-3 max-w-xs text-sm leading-relaxed text-ink-muted">{s.sub}</p>
                  </div>
                </FadeUp>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Industries (optional) ── */}
      {data.industries && data.industries.length > 0 && (
        <section id="where-it-fits" className="scroll-mt-24 border-t border-hairline px-4 py-16 sm:px-6 md:py-20 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <SectionEyebrow>{t('eyebrowWhereItFits')}</SectionEyebrow>
            <BrandedHeading as="h2" size="lg">
              {data.industriesHeading ?? t('industriesHeadingDefault')}
            </BrandedHeading>
            {/* Industries grid — 2 cols on md+ (not 3) so wider cards
                give the substantial pain copy room to breathe. For an
                odd card count (5, 7, 9...), the last card spans both
                columns and centers, avoiding the empty-cell look. */}
            <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2">
              {data.industries.map((ind, i) => {
                const isLastOdd =
                  data.industries!.length % 2 === 1 &&
                  i === data.industries!.length - 1;
                return (
                  <FadeUp
                    key={i}
                    delay={i * 0.06}
                    className={isLastOdd ? 'md:col-span-2' : ''}
                  >
                    <div
                      className={[
                        'h-full rounded-md border border-hairline bg-canvas-card p-6 transition-colors hover:border-lab/30 hover:bg-canvas-card',
                        isLastOdd ? 'md:mx-auto md:max-w-xl' : '',
                      ].join(' ')}
                    >
                      <h3 className="text-base font-semibold tracking-tight text-navy">{ind.name}</h3>
                      <p className="mt-3 text-sm leading-relaxed text-ink-muted">{ind.pain}</p>
                    </div>
                  </FadeUp>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ── FAQ (optional) ── */}
      {data.faqs && data.faqs.length > 0 && (
        <section id="common-questions" className="scroll-mt-24 border-t border-hairline px-4 py-16 sm:px-6 md:py-20 lg:px-8">
          <div className="mx-auto max-w-3xl">
            <SectionEyebrow>{t('eyebrowCommonQuestions')}</SectionEyebrow>
            <BrandedHeading as="h2" size="lg">
              {data.faqsHeading ?? t('faqsHeadingDefault')}
            </BrandedHeading>
            <div className="mt-10">
              {data.faqs.map((f, i) => (
                <FaqItem key={i} q={f.q} a={f.a} />
              ))}
              <div className="border-t border-hairline" />
            </div>
          </div>
        </section>
      )}

      {/* ── Closing CTA ── */}
      <section id="start" className="scroll-mt-24 border-t border-hairline px-4 py-20 sm:px-6 md:py-28 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <FadeUp>
            <p className="mb-6 font-mono text-xs uppercase tracking-[0.3em] text-lab-ink">
              {data.cta?.eyebrow ?? t('ctaEyebrowDefault')}
            </p>
            <BrandedHeading as="h2" size="xl">
              {data.cta?.headline ?? t('ctaHeadingDefault')}
            </BrandedHeading>
            <p className="mx-auto mt-6 max-w-xl text-lg text-ink">
              {data.cta?.sub ?? t('ctaSubDefault')}
            </p>
            <div className="mt-12 flex flex-wrap items-center justify-center gap-3">
              <Link
                href={data.cta?.primary.href ?? '/audit'}
                data-cursor="magnetic"
                data-cursor-strength="28"
                className="rounded-full bg-white px-8 py-4 text-sm font-medium text-black transition-colors hover:bg-canvas-card"
              >
                {data.cta?.primary.label ?? t('ctaPrimaryDefault')}
              </Link>
              {data.cta?.secondary && (
                <Link
                  href={data.cta.secondary.href}
                  data-cursor="hover"
                  className="px-4 py-4 text-sm text-ink transition-colors hover:text-navy"
                >
                  {data.cta.secondary.label} →
                </Link>
              )}
            </div>
          </FadeUp>
        </div>
      </section>
    </main>
  );
}
