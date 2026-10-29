import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { pageMetadata } from '@/lib/seo';
import AuditEnquiryForm from '@/components/AuditEnquiryForm';
import { AnimatedText } from '@/components/ui/AnimatedText';
import { BrandedHeading } from '@/components/ui/BrandedHeading';
import { FadeUp } from '@/components/motion/FadeUp';
import { SectionEyebrow } from '@/components/ui/SectionEyebrow';
import { CheckCircle2 } from 'lucide-react';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'audit' });
  return pageMetadata({
    locale,
    path: '/audit',
    title: t('metaTitle'),
    description: t('metaDescription'),
  });
}

export default async function AuditPage() {
  const t = await getTranslations('audit');
  const whatYouGet = t.raw('whatYouGet') as { title: string; body: string }[];

  return (
    <main className="bg-canvas">
      <section className="relative overflow-hidden px-4 py-24 sm:px-6 md:py-32 lg:px-8">
        {/* Subtle ambient teal glow behind the hero */}
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-24 h-[420px] w-[800px] -translate-x-1/2 rounded-full bg-lab/[0.05] blur-3xl"
        />

        <div className="relative mx-auto max-w-6xl">
          <div className="grid grid-cols-1 gap-16 lg:grid-cols-12 lg:gap-20">
            {/* Left — pitch */}
            <div className="lg:col-span-6">
              <SectionEyebrow>{t('eyebrow')}</SectionEyebrow>
              <BrandedHeading as="h1" size="xl">
                {t('heading')}
              </BrandedHeading>
              <AnimatedText
                as="p"
                variant="words"
                className="mt-8 max-w-lg text-base leading-relaxed text-ink md:text-lg"
                delay={0.15}
              >
                {t('lede')}
              </AnimatedText>

              <div className="mt-14 space-y-7">
                {whatYouGet.map((item, i) => (
                  <FadeUp key={i} delay={i * 0.08}>
                    <div className="flex items-start gap-4">
                      <span className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border border-lab/40 bg-lab/10 text-lab-ink">
                        <CheckCircle2 size={14} strokeWidth={2.25} />
                      </span>
                      <div>
                        <h3 className="text-base font-semibold tracking-tight text-navy md:text-lg">
                          {item.title}
                        </h3>
                        <p className="mt-1 max-w-sm text-sm leading-relaxed text-ink-muted md:text-base">
                          {item.body}
                        </p>
                      </div>
                    </div>
                  </FadeUp>
                ))}
              </div>
            </div>

            {/* Right — form */}
            <div className="lg:col-span-6">
              <FadeUp>
                <div className="rounded-2xl border border-hairline bg-canvas-card p-7 backdrop-blur-md md:p-9">
                  <p className="mb-1 font-mono text-[11px] uppercase tracking-[0.32em] text-lab-ink">
                    {t('formEyebrow')}
                  </p>
                  <BrandedHeading as="h2" size="sm" className="mb-7">
                    {t('formHeading')}
                  </BrandedHeading>
                  <AuditEnquiryForm />
                </div>
              </FadeUp>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
