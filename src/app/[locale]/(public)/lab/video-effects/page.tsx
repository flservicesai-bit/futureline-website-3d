/**
 * /lab/video-effects — FL Lab demo: upload a short video, apply one of
 * four FFmpeg-driven generative looks, download the result. MVP that
 * proves the "AI builds video effect tools" thesis FL Academy
 * is teaching toward.
 */
import { getServerSession } from 'next-auth';
import { getTranslations } from 'next-intl/server';
import { authOptions } from '@/lib/auth';
import { Link } from '@/i18n/routing';
import { SectionEyebrow } from '@/components/ui/SectionEyebrow';
import { BrandedHeading } from '@/components/ui/BrandedHeading';
import { VideoEffectsClient } from './VideoEffectsClient';
import { metadataFor } from '@/lib/seo';

export const generateMetadata = metadataFor('videoLab', '/lab/video-effects');

export const dynamic = 'force-dynamic';

export default async function VideoEffectsLabPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  // Processing is limited to signed-in users (see the API route), so show
  // visitors a sign-in prompt instead of an uploader that would reject them.
  const session = await getServerSession(authOptions);
  const t = await getTranslations('videoLab');
  return (
    <main className="bg-canvas">
      <section className="scroll-mt-24 px-4 py-16 sm:px-6 md:py-20 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <div className="mx-auto mb-10 max-w-3xl text-center md:mb-14">
            <SectionEyebrow accent="lab">{t('eyebrow')}</SectionEyebrow>
            <BrandedHeading as="h1" size="xl" className="mt-3">
              {t('heading')}
            </BrandedHeading>
            <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-ink md:text-lg">
              {t('lede')}
            </p>
          </div>

          {session ? (
            <VideoEffectsClient />
          ) : (
            <div className="mx-auto max-w-md rounded-card border border-hairline bg-canvas-card p-8 text-center">
              <p className="mb-6 text-sm leading-relaxed text-ink">
                {t('signInPrompt')}
              </p>
              <Link
                href={{ pathname: '/login', query: { callbackUrl: `/${locale}/lab/video-effects` } }}
                className="fl-submit"
              >
                {t('signIn')}
              </Link>
            </div>
          )}

          <div className="mx-auto mt-12 max-w-2xl text-center text-xs text-ink-muted">
            {t.rich('limits', {
              artist: (chunks) => (
                <a
                  href="https://www.instagram.com/abdullrhman_ha/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-lab-ink hover:text-navy underline-offset-2 hover:underline"
                >
                  {chunks}
                </a>
              ),
            })}
          </div>
        </div>
      </section>
    </main>
  );
}
