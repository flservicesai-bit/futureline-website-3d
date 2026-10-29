import { Link } from '@/i18n/routing';
import { Mail, ArrowRight } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { getBrandSettings } from '@/lib/brand';
import HeroRibbon3D from '@/components/sections/HeroRibbon3DLazy';
import { AnimatedText } from '@/components/ui/AnimatedText';
import { BrandedHeading } from '@/components/ui/BrandedHeading';
import { MarqueeStrip } from '@/components/ui/MarqueeStrip';
import { FadeUp } from '@/components/motion/FadeUp';
import { SectionEyebrow } from '@/components/ui/SectionEyebrow';
import { metadataFor } from '@/lib/seo';

export const generateMetadata = metadataFor('ai', '/ai');

export const dynamic = 'force-dynamic';

export default async function AIPage() {
  const t = await getTranslations('aiPage');
  const brand = await getBrandSettings();
  const contactEmail = brand.contactEmail;

  const capabilities = t.raw('capabilities.items') as { title: string; body: string }[];
  const vision = t.raw('vision.items') as string[];
  const stats = t.raw('stats') as { value: string; label: string; sub: string }[];

  return (
    <main className="bg-canvas">
      {/* ── Hero ── */}
      <section className="relative overflow-hidden border-b border-hairline">
        <div className="absolute inset-y-0 end-0 z-0 w-full md:w-1/2">
          <HeroRibbon3D color="#18A999" tilt={0.32} />
        </div>
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-r from-canvas via-canvas/85 to-transparent rtl:bg-gradient-to-l md:via-canvas/55"
        />

        <div className="relative z-10 mx-auto max-w-7xl px-4 py-32 sm:px-6 md:py-44 lg:px-8">
          <div className="grid grid-cols-1 items-center gap-12 md:grid-cols-12">
            <div className="md:col-span-7">
              <p className="mb-6 flex items-center gap-2 font-mono text-xs uppercase tracking-[0.4em] text-lab-ink">
                <span
                  aria-hidden
                  className="block h-1.5 w-1.5 rounded-full bg-lab shadow-[0_0_10px_2px_rgba(24,169,153,0.55)]"
                />
                {t('hero.eyebrow')}
              </p>
              <BrandedHeading as="h1" size="xl">
                {t('hero.heading')}
              </BrandedHeading>
              <AnimatedText
                as="p"
                variant="words"
                className="mt-8 max-w-xl text-lg leading-relaxed text-ink md:text-xl"
                delay={0.2}
              >
                {t('hero.lead')}
              </AnimatedText>
              <p className="mt-4 max-w-xl text-sm text-ink-muted">
                {t('hero.note')}
              </p>
              <FadeUp delay={0.4}>
                <div className="mt-10 flex flex-wrap items-center gap-3">
                  <Link
                    href={`mailto:${contactEmail}?subject=FL%20AI%20Enquiry`}
                    data-cursor="magnetic"
                    data-cursor-strength="22"
                    className="inline-flex items-center gap-2 rounded-full bg-navy px-7 py-3 text-sm font-medium text-white transition-colors hover:bg-navy-light"
                  >
                    {t('hero.ctaPrimary')} <Mail size={15} />
                  </Link>
                  <Link
                    href="/courses"
                    data-cursor="hover"
                    className="inline-flex items-center gap-1 px-3 py-3 text-sm text-ink transition-colors hover:text-navy"
                  >
                    {t('hero.ctaSecondary')} <ArrowRight size={14} className="rtl:rotate-180" />
                  </Link>
                </div>
              </FadeUp>
            </div>
          </div>
        </div>
      </section>

      <MarqueeStrip
        items={t.raw('marquee') as string[]}
        speed={32}
      />

      {/* ── Capabilities (numbered editorial rows) ── */}
      <section className="px-4 py-32 sm:px-6 md:py-44 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-16 md:mb-24">
            <SectionEyebrow>{t('capabilities.eyebrow')}</SectionEyebrow>
            <BrandedHeading as="h2" size="lg">
              {t('capabilities.heading')}
            </BrandedHeading>
            <AnimatedText
              as="p"
              variant="words"
              className="mt-8 max-w-xl text-lg leading-relaxed text-ink-muted md:text-xl"
              delay={0.15}
            >
              {t('capabilities.lead')}
            </AnimatedText>
          </div>

          <div className="space-y-0">
            {capabilities.map((c, i) => (
              <article
                key={i}
                className="relative grid grid-cols-12 gap-6 border-t border-hairline py-12 md:gap-12 md:py-16"
              >
                <div className="col-span-12 md:col-span-3">
                  <p className="font-mono text-sm tracking-[0.3em] text-lab-ink">
                    {String(i + 1).padStart(2, '0')}
                  </p>
                </div>
                <div className="col-span-12 md:col-span-9">
                  <AnimatedText
                    as="h3"
                    variant="chars"
                    className="text-3xl font-semibold leading-[1.05] tracking-[-0.01em] text-navy md:text-[clamp(2rem,4vw,3.5rem)]"
                  >
                    {c.title}
                  </AnimatedText>
                  <AnimatedText
                    as="p"
                    variant="words"
                    className="mt-6 max-w-2xl text-base leading-relaxed text-ink-muted md:text-lg"
                    delay={0.1}
                  >
                    {c.body}
                  </AnimatedText>
                </div>
              </article>
            ))}
            <div className="border-t border-hairline" />
          </div>
        </div>
      </section>

      {/* ── Vision + Stats split ── */}
      <section className="border-t border-hairline px-4 py-32 sm:px-6 md:py-44 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="grid grid-cols-1 gap-16 md:grid-cols-12 md:gap-12">
            <div className="md:col-span-5">
              <SectionEyebrow>{t('vision.eyebrow')}</SectionEyebrow>
              <BrandedHeading as="h2" size="lg">
                {t('vision.heading')}
              </BrandedHeading>
              <p className="mt-8 max-w-md text-base leading-relaxed text-ink-muted md:text-lg">
                {t('vision.body')}
              </p>

              <ul className="mt-10">
                {vision.map((item, i) => (
                  <li
                    key={i}
                    className="flex items-baseline gap-4 border-t border-hairline py-4 text-sm text-ink md:text-base"
                  >
                    <span
                      aria-hidden
                      className="font-mono text-[10px] tracking-[0.3em] text-lab-ink"
                    >
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="md:col-span-7">
              <div className="grid grid-cols-1 gap-x-12 md:grid-cols-2 md:gap-y-4">
                {stats.map((s, i) => (
                  <FadeUp key={i} delay={i * 0.08}>
                    <div className="border-t border-hairline py-8">
                      <p className="text-5xl font-semibold tracking-tight text-navy md:text-6xl">
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
          </div>
        </div>
      </section>

      {/* ── Closing CTA ── */}
      <section className="border-t border-hairline px-4 py-32 sm:px-6 md:py-44 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <FadeUp>
            <p className="mb-6 font-mono text-xs uppercase tracking-[0.3em] text-lab-ink">
              {t('cta.eyebrow')}
            </p>
            <BrandedHeading as="h2" size="xl">
              {t('cta.heading')}
            </BrandedHeading>
            <p className="mx-auto mt-6 max-w-xl text-lg text-ink">
              {t('cta.body')}
            </p>
            <div className="mt-12 flex flex-wrap items-center justify-center gap-3">
              <Link
                href={`mailto:${contactEmail}?subject=FL%20AI%20Enquiry`}
                data-cursor="magnetic"
                data-cursor-strength="28"
                className="inline-flex items-center gap-2 rounded-full bg-white px-8 py-4 text-sm font-medium text-black transition-colors hover:bg-canvas-card"
              >
                {t('cta.ctaPrimary')} <Mail size={15} />
              </Link>
              <Link
                href="/services/consultation"
                data-cursor="hover"
                className="px-4 py-4 text-sm text-ink transition-colors hover:text-navy"
              >
                {t('cta.ctaSecondary')}
              </Link>
            </div>
          </FadeUp>
        </div>
      </section>
    </main>
  );
}
