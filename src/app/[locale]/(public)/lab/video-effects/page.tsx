/**
 * /lab/video-effects — FL Lab demo: upload a short video, apply one of
 * four FFmpeg-driven generative looks, download the result. MVP that
 * proves the "AI builds video effect tools" thesis FL Academy
 * is teaching toward.
 */
import type { Metadata } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { Link } from '@/i18n/routing';
import { SectionEyebrow } from '@/components/ui/SectionEyebrow';
import { BrandedHeading } from '@/components/ui/BrandedHeading';
import { VideoEffectsClient } from './VideoEffectsClient';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Video Effects Lab | FutureLine',
  description:
    'Upload a short video, pick a generative look, get the result in seconds. An FL Lab demo of AI-built video tools.',
};

export default async function VideoEffectsLabPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  // Processing is limited to signed-in users (see the API route), so show
  // visitors a sign-in prompt instead of an uploader that would reject them.
  const session = await getServerSession(authOptions);
  return (
    <main className="bg-canvas">
      <section className="scroll-mt-24 px-4 py-16 sm:px-6 md:py-20 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <div className="mx-auto mb-10 max-w-3xl text-center md:mb-14">
            <SectionEyebrow accent="lab">FL Lab · Demo</SectionEyebrow>
            <BrandedHeading as="h1" size="xl" className="mt-3">
              Apply Cinematic Effects to Your Video.
            </BrandedHeading>
            <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-ink md:text-lg">
              Upload a short clip, pick a look, download the result. The
              processing pipeline runs on FFmpeg. The effect graphs were
              prototyped with AI — exactly the workflow FL Academy
              teaches.
            </p>
          </div>

          {session ? (
            <VideoEffectsClient />
          ) : (
            <div className="mx-auto max-w-md rounded-card border border-hairline bg-canvas-card p-8 text-center">
              <p className="mb-6 text-sm leading-relaxed text-ink">
                Sign in to try the lab. Videos are processed on our servers, so it&apos;s open to
                registered users.
              </p>
              <Link
                href={{ pathname: '/login', query: { callbackUrl: `/${locale}/lab/video-effects` } }}
                className="fl-submit"
              >
                Sign in to continue
              </Link>
            </div>
          )}

          <div className="mx-auto mt-12 max-w-2xl text-center text-xs text-ink-muted">
            Max 50 MB · clipped to the first 30 seconds · MP4 output ·
            inspired by the Saudi visual artist{' '}
            <a
              href="https://www.instagram.com/abdullrhman_ha/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-lab hover:text-lab-light underline-offset-2 hover:underline"
            >
              @abdullrhman_ha
            </a>
            's TouchDesigner-into-Claude workflow.
          </div>
        </div>
      </section>
    </main>
  );
}
