import { Link } from '@/i18n/routing';
import { getTranslations } from 'next-intl/server';
import { prisma } from '@/lib/prisma';
import { ArrowRight } from 'lucide-react';
import ServiceEnquiryForm from '@/components/ServiceEnquiryForm';
import HeroRibbon3D from '@/components/sections/HeroRibbon3DLazy';
import { AnimatedText } from '@/components/ui/AnimatedText';
import { BrandedHeading } from '@/components/ui/BrandedHeading';
import { MarqueeStrip } from '@/components/ui/MarqueeStrip';
import { FadeUp } from '@/components/motion/FadeUp';
import { SectionEyebrow } from '@/components/ui/SectionEyebrow';
import { metadataFor } from '@/lib/seo';

export const generateMetadata = metadataFor('services', '/services');

export const dynamic = 'force-dynamic';

// Title → slug map for our four hero services. Other DB services render
// as cards without click-through.
const SERVICE_SLUGS: Record<string, string> = {
  'Digitalisation': '/services/digitalisation',
  'Custom Software': '/services/custom-software',
  'Automations': '/services/automations',
  'Consultation': '/services/consultation',
};

export default async function ServicesPage() {
  const t = await getTranslations('services');
  const services = await prisma.service.findMany({
    where: { status: 'ACTIVE' },
    orderBy: [{ featured: 'desc' }, { createdAt: 'asc' }],
  });

  return (
    <main className="bg-canvas">
      {/* ── Hero ── */}
      <section className="relative overflow-hidden border-b border-hairline">
        {/* The signature 3D ribbon on the right side. */}
        <div className="absolute inset-y-0 end-0 z-0 w-full md:w-1/2">
          <HeroRibbon3D color="#18A999" tilt={0.32} />
        </div>
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-r from-canvas via-canvas/85 to-transparent rtl:bg-gradient-to-l md:via-canvas/55"
        />

        <div className="relative z-10 mx-auto max-w-7xl px-4 py-32 sm:px-6 md:py-44 lg:px-8">
          <div className="grid grid-cols-1 items-center gap-12 md:grid-cols-12 md:gap-16">
            <div className="md:col-span-7">
              <p className="mb-6 flex items-center gap-2 font-mono text-xs uppercase tracking-[0.4em] text-lab-ink">
                <span aria-hidden className="block h-1.5 w-1.5 rounded-full bg-lab shadow-[0_0_10px_2px_rgba(24,169,153,0.55)]" />
                FL · Lab
              </p>
              <BrandedHeading as="h1" size="xl">
                {t('heading')}
              </BrandedHeading>
              <AnimatedText
                as="p"
                variant="words"
                className="mt-8 max-w-xl text-lg leading-relaxed text-ink md:text-xl"
                delay={0.2}
              >
                {t('lede')}
              </AnimatedText>
              <FadeUp delay={0.4}>
                <div className="mt-12 flex flex-wrap items-center gap-3">
                  <Link
                    href="#services-grid"
                    data-cursor="magnetic"
                    data-cursor-strength="22"
                    className="rounded-full bg-navy px-7 py-3 text-sm font-medium text-white transition-colors hover:bg-navy-light"
                  >
                    {t('browse')}
                  </Link>
                  <Link
                    href="/audit"
                    data-cursor="hover"
                    className="px-3 py-3 text-sm text-ink transition-colors hover:text-navy"
                  >
                    {t('freeAudit')}
                  </Link>
                </div>
              </FadeUp>
            </div>
          </div>
        </div>
      </section>

      <MarqueeStrip
        items={[
          'Digitalisation',
          'Custom Software',
          'Automations',
          'Consultation',
          t('marqueeTagline'),
        ]}
        speed={32}
      />

      {/* ── Services grid (editorial cards) ── */}
      <section id="services-grid" className="px-4 py-32 sm:px-6 md:py-44 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto mb-16 max-w-3xl text-center md:mb-24">
            <SectionEyebrow>{t('gridEyebrow')}</SectionEyebrow>
            <BrandedHeading as="h2" size="xl">
              {t('gridHeading')}
            </BrandedHeading>
            <p className="mx-auto mt-8 max-w-2xl text-lg leading-relaxed text-ink-muted md:text-xl">
              {t('gridLede')}
            </p>
          </div>

          {services.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <p className="font-mono text-xs uppercase tracking-[0.3em] text-ink-muted">{t('empty')}</p>
              <p className="mt-3 text-sm text-ink-muted">{t('emptyBody')}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
              {services.map((service, i) => {
                const slug = SERVICE_SLUGS[service.title];
                const num = String(i + 1).padStart(2, '0');

                const cardClass =
                  'group relative flex h-full flex-col overflow-hidden rounded-md border border-hairline bg-canvas-card p-7 backdrop-blur-sm transition-colors duration-300 hover:border-lab/40 hover:bg-canvas-card';

                const inner = (
                  <>
                    <div className="mb-8 flex items-baseline justify-between">
                      <span className="font-mono text-[11px] uppercase tracking-[0.3em] text-lab-ink">{num}</span>
                      {service.featured && (
                        <span className="rounded-full border border-lab/30 bg-lab/10 px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.25em] text-lab-ink">
                          {t('featured')}
                        </span>
                      )}
                    </div>
                    <h3 className="text-2xl font-semibold leading-[1.05] tracking-[-0.01em] text-navy transition-colors group-hover:text-navy">
                      {service.title}
                    </h3>
                    <p className="mt-5 flex-1 text-sm leading-relaxed text-ink-muted">
                      {service.description}
                    </p>
                    <div className="mt-8 flex items-center justify-between border-t border-hairline pt-5">
                      <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-ink-muted">
                        {service.pricingModel ?? t('learnMore')}
                      </span>
                      <ArrowRight
                        size={14}
                        className="text-ink-muted transition-all group-hover:translate-x-1 group-hover:text-lab-ink rtl:rotate-180 rtl:group-hover:-translate-x-1"
                      />
                    </div>
                  </>
                );

                return slug ? (
                  <Link key={service.id} href={slug} className={cardClass} data-cursor="hover">
                    {inner}
                  </Link>
                ) : (
                  <div key={service.id} className={cardClass}>
                    {inner}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* ── Enquiry ── */}
      <section id="enquiry" className="border-t border-hairline px-4 py-32 sm:px-6 md:py-44 lg:px-8">
        <div className="mx-auto max-w-2xl">
          <FadeUp>
            <div className="mb-12 text-center">
              <SectionEyebrow>{t('enquiryEyebrow')}</SectionEyebrow>
              <BrandedHeading as="h2" size="lg" className="mt-3">
                {t('enquiryHeading')}
              </BrandedHeading>
              <p className="mx-auto mt-6 max-w-lg text-base leading-relaxed text-ink-muted">
                {t('enquiryLede')}
              </p>
            </div>
          </FadeUp>
          <ServiceEnquiryForm />
        </div>
      </section>
    </main>
  );
}
