import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import { Link } from '@/i18n/routing';
import {
  Clock,
  MapPin,
  Users,
  Calendar,
  BookOpen,
  CheckCircle,
  ChevronLeft,
} from 'lucide-react';
import EnrollButton from '@/components/EnrollButton';
import { WaitlistRecorder } from '@/components/courses/WaitlistRecorder';
import { formatPrice } from '@/lib/utils';
import { AnimatedText } from '@/components/ui/AnimatedText';
import { BrandedHeading } from '@/components/ui/BrandedHeading';
import { FadeUp } from '@/components/motion/FadeUp';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { pageMetadata } from '@/lib/seo';
import { courseDeliveryLabel, courseLevelLabel } from '@/lib/course-labels';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const t = await getTranslations({ locale, namespace: 'meta' });
  const course = await prisma.course.findUnique({
    where: { slug },
    select: { title: true, shortDescription: true, slug: true },
  });
  if (!course) return { title: t('courseNotFound'), robots: { index: false, follow: true } };
  return pageMetadata({
    locale,
    path: `/courses/${course.slug}`,
    title: t('courseTitle', { title: course.title }),
    description: course.shortDescription || t('courseFallbackDescription', { title: course.title }),
  });
}

export default async function CourseDetailPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  const t = await getTranslations({ locale, namespace: 'courseDetail' });
  const tc = await getTranslations({ locale, namespace: 'coursesPage' });
  const course = await prisma.course.findUnique({
    where: { slug },
    include: {
      instructor: { select: { firstName: true, lastName: true, email: true } },
      _count: { select: { enrollments: true, lessons: true } },
    },
  });

  if (!course || course.status !== 'PUBLISHED') return notFound();

  const priceLabel = course.price > 0 ? formatPrice(course.discountPrice ?? course.price) : t('free');
  const levelLabel = courseLevelLabel(tc, course.level);
  const deliveryLabel = courseDeliveryLabel(tc, course.deliveryType);
  // Latin digits keep numbers consistent with prices and the rest of /ar.
  const dateLocale = locale === 'ar' ? 'ar-OM-u-nu-latn' : 'en-GB';
  const formatDate = (d: Date) =>
    new Date(d).toLocaleDateString(dateLocale, { day: 'numeric', month: 'short', year: 'numeric' });
  // Counts render as plain strings so Arabic keeps Latin digits too.
  const count = (n: number) => ({ count: n, n: String(n) });
  const enrolled = course._count.enrollments;
  const lessons = course._count.lessons;

  return (
    <main className="bg-canvas">
      {/* Records anyone arriving from the promo's "Join the waitlist"
          button, which returns here after Google sign-in. */}
      <WaitlistRecorder slug={course.slug} />

      {/* ── Hero ── */}
      <section className="relative overflow-hidden border-b border-hairline">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-academy-glow opacity-60"
        />
        <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 md:py-28 lg:px-8">
          <Link
            href="/courses"
            data-cursor="hover"
            className="mb-10 inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.3em] text-ink-muted transition-colors hover:text-academy"
          >
            <ChevronLeft size={13} className="rtl:rotate-180" /> {t('backToCatalog')}
          </Link>

          <div className="flex flex-wrap items-center gap-2 mb-6">
            <span className="rounded-full border border-academy/30 bg-academy/10 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.25em] text-academy">
              {levelLabel}
            </span>
            {course.category && (
              <span
                dir="auto"
                className="rounded-full border border-hairline bg-canvas-card px-3 py-1 font-mono text-[10px] uppercase tracking-[0.25em] text-ink"
              >
                {course.category}
              </span>
            )}
            <span className="rounded-full border border-hairline bg-canvas-card px-3 py-1 font-mono text-[10px] uppercase tracking-[0.25em] text-ink">
              {deliveryLabel}
            </span>
          </div>

          <BrandedHeading as="h1" size="xl">
            {course.title}
          </BrandedHeading>

          <AnimatedText
            as="p"
            variant="words"
            className="mt-8 max-w-2xl text-lg leading-relaxed text-ink md:text-xl"
            delay={0.15}
          >
            {course.shortDescription || t('fallbackDescription', { title: course.title })}
          </AnimatedText>

          <FadeUp delay={0.3}>
            <div className="mt-10 flex flex-wrap gap-x-8 gap-y-3 font-mono text-[11px] uppercase tracking-[0.25em] text-ink-muted">
              {course.durationHours > 0 && (
                <span className="flex items-center gap-2">
                  <Clock size={13} /> {t('hoursOfContent', count(course.durationHours))}
                </span>
              )}
              {course.instructor && (
                <span className="flex items-center gap-2">
                  <Users size={13} /> {course.instructor.firstName} {course.instructor.lastName}
                </span>
              )}
              {course.location && (
                <span className="flex items-center gap-2">
                  <MapPin size={13} /> {course.location}
                </span>
              )}
              {course.startDate && (
                <span className="flex items-center gap-2">
                  <Calendar size={13} />
                  {formatDate(course.startDate)}
                  {course.endDate && ` – ${formatDate(course.endDate)}`}
                </span>
              )}
              {/* Counters are hidden at zero: "0 enrolled" reads as an
                  empty course, not a new one. */}
              {enrolled > 0 && (
                <span className="flex items-center gap-2">
                  <Users size={13} /> {t('studentsEnrolled', count(enrolled))}
                </span>
              )}
            </div>
          </FadeUp>
        </div>
      </section>

      {/* ── Body ── */}
      <section className="px-4 py-20 sm:px-6 md:py-28 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-3 lg:gap-16">
            {/* ── Left: course content ── */}
            <div className="space-y-16 lg:col-span-2">
              {course.marketingVideoUrl && (
                <FadeUp>
                  <div>
                    <p className="mb-6 font-mono text-[11px] uppercase tracking-[0.3em] text-academy">
                      {t('preview')}
                    </p>
                    <div className="aspect-video overflow-hidden rounded-md border border-hairline bg-black">
                      <iframe
                        src={
                          course.marketingVideoUrl.includes('youtube.com') ||
                          course.marketingVideoUrl.includes('youtu.be')
                            ? `https://www.youtube.com/embed/${
                                new URL(course.marketingVideoUrl).searchParams.get('v') ||
                                course.marketingVideoUrl.split('/').pop()
                              }`
                            : course.marketingVideoUrl.includes('vimeo.com')
                            ? `https://player.vimeo.com/video/${
                                course.marketingVideoUrl.match(/\d+/)?.[0]
                              }`
                            : course.marketingVideoUrl
                        }
                        title={t('previewTitle')}
                        className="h-full w-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    </div>
                  </div>
                </FadeUp>
              )}

              {course.fullDescription && (
                <FadeUp>
                  <div>
                    <p className="mb-6 font-mono text-[11px] uppercase tracking-[0.3em] text-academy">
                      {t('aboutEyebrow')}
                    </p>
                    <BrandedHeading as="h2" size="md">
                      {t('aboutHeading')}
                    </BrandedHeading>
                    {/* Course copy comes from the database and is English-only
                        for now; dir="auto" keeps it readable on /ar. */}
                    <p
                      dir="auto"
                      className="mt-6 whitespace-pre-line text-base leading-relaxed text-ink md:text-lg"
                    >
                      {course.fullDescription}
                    </p>
                  </div>
                </FadeUp>
              )}
            </div>

            {/* ── Right: enrolment card ── */}
            <aside className="lg:col-span-1">
              <div className="sticky top-24 overflow-hidden rounded-md border border-hairline bg-canvas-card backdrop-blur-sm">
                <div className="relative flex h-40 items-center justify-center border-b border-hairline bg-gradient-to-br from-academy/15 via-canvas to-canvas">
                  <BookOpen className="text-ink-muted" size={36} />
                  <div className="absolute bottom-3 left-3 flex items-center gap-2">
                    <span className="rounded-full border border-academy/30 bg-academy/10 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.2em] text-academy">
                      {levelLabel}
                    </span>
                    {course.durationHours > 0 && (
                      <span className="rounded-full border border-hairline bg-canvas-card px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.2em] text-ink backdrop-blur-md">
                        {course.durationHours}
                        {tc('hoursSuffix')}
                      </span>
                    )}
                  </div>
                </div>

                <div className="space-y-6 p-6">
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-ink-muted">
                      {t('price')}
                    </p>
                    <div className="mt-2 flex items-baseline gap-3">
                      <span className="text-4xl font-semibold tracking-tight text-navy">
                        {priceLabel}
                      </span>
                      {course.discountPrice && course.discountPrice < course.price && (
                        <span className="text-sm text-ink-muted line-through">
                          {formatPrice(course.price)}
                        </span>
                      )}
                    </div>
                  </div>

                  <EnrollButton
                    courseId={course.id}
                    slug={course.slug}
                    price={course.discountPrice ?? course.price}
                  />

                  <div className="space-y-2.5 border-t border-hairline pt-5 font-mono text-[11px] uppercase tracking-[0.25em] text-ink-muted">
                    {course.durationHours > 0 && (
                      <div className="flex items-center gap-2">
                        <Clock size={12} /> {t('hoursOfContent', count(course.durationHours))}
                      </div>
                    )}
                    {lessons > 0 && (
                      <div className="flex items-center gap-2">
                        <BookOpen size={12} /> {t('lessons', count(lessons))}
                      </div>
                    )}
                    {enrolled > 0 && (
                      <div className="flex items-center gap-2">
                        <Users size={12} /> {t('studentsEnrolled', count(enrolled))}
                      </div>
                    )}
                    {/* "0 seats left" stays visible: it tells people the cohort is full. */}
                    {course.seatCapacity != null && course.seatCapacity > 0 && (
                      <div className="flex items-center gap-2 text-academy">
                        <CheckCircle size={12} />
                        {t('seatsLeft', count(Math.max(0, course.seatCapacity - enrolled)))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </section>
    </main>
  );
}
