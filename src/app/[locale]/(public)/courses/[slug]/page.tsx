import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { notFound } from 'next/navigation';
import { Link } from '@/i18n/routing';
import {
  Armchair,
  BarChart3,
  BookOpen,
  CalendarDays,
  Check,
  ChevronRight,
  Clock,
  Laptop,
  MapPin,
  UserRound,
  Users,
} from 'lucide-react';
import EnrollButton, { type EnrollState } from '@/components/EnrollButton';
import { formatCoursePrice } from '@/lib/utils';
import { getBrandSettings } from '@/lib/brand';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { pageMetadata } from '@/lib/seo';
import { courseDeliveryLabel, courseLevelLabel } from '@/lib/course-labels';
import { videoEmbedUrl } from '@/lib/video-embed';
import { courseImage } from '@/lib/course-image';
import { CourseCover } from '@/components/courses/CourseCover';
import { CourseCard, courseCardSelect } from '@/components/courses/CourseCard';

export const dynamic = 'force-dynamic';

/** Same rule as the catalog and sitemap: published AND approved by an admin. */
function isPublic(course: { status: string; approvalStatus: string }) {
  return course.status === 'PUBLISHED' && course.approvalStatus === 'APPROVED';
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const t = await getTranslations({ locale, namespace: 'meta' });
  const course = await prisma.course.findUnique({
    where: { slug },
    select: { title: true, shortDescription: true, slug: true, status: true, approvalStatus: true },
  });
  if (!course || !isPublic(course)) {
    return { title: t('courseNotFound'), robots: { index: false, follow: true } };
  }
  return pageMetadata({
    locale,
    path: `/courses/${course.slug}`,
    title: t('courseTitle', { title: course.title }),
    description: course.shortDescription || t('courseFallbackDescription', { title: course.title }),
  });
}

const SECTION_HEADING = 'text-2xl font-semibold tracking-tight text-navy';

export default async function CourseDetailPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  const t = await getTranslations({ locale, namespace: 'courseDetail' });
  const tc = await getTranslations({ locale, namespace: 'coursesPage' });
  const brand = await getBrandSettings();
  const course = await prisma.course.findUnique({
    where: { slug },
    include: {
      instructor: { select: { firstName: true, lastName: true, bio: true, image: true } },
      lessons: { select: { id: true, moduleTitle: true, lessonTitle: true }, orderBy: { orderIndex: 'asc' } },
      _count: { select: { enrollments: true } },
    },
  });

  if (!course || course.status !== 'PUBLISHED') return notFound();

  const session = await getServerSession(authOptions);

  // Unapproved courses stay hidden from the public. The admin's "Preview
  // course" link and the course's own instructor can still open them.
  let awaitingApproval = false;
  if (!isPublic(course)) {
    const canPreview =
      session?.user.role === 'ADMIN' ||
      (!!session?.user.id && session.user.id === course.instructorId);
    if (!canPreview) return notFound();
    awaitingApproval = true;
  }

  // Enrolled visitors get "Go to course"; a bank transfer awaiting approval
  // shows as pending instead of offering to pay again.
  let enrollState: EnrollState = 'none';
  if (session?.user.id) {
    const [enrollment, pendingOrder] = await Promise.all([
      prisma.enrollment.findUnique({
        where: { userId_courseId: { userId: session.user.id, courseId: course.id } },
        select: { id: true },
      }),
      prisma.order.findFirst({
        where: { userId: session.user.id, courseId: course.id, paymentStatus: 'PENDING' },
        select: { id: true },
      }),
    ]);
    enrollState = enrollment ? 'enrolled' : pendingOrder ? 'pending' : 'none';
  }

  // Up to three more courses: the same category first, topped up with the
  // newest others so the section isn't empty when a category has one course.
  const publicOthers = {
    status: 'PUBLISHED' as const,
    approvalStatus: 'APPROVED' as const,
    id: { not: course.id },
    NOT: { title: { equals: 'Test', mode: 'insensitive' as const } },
  };
  const sameCategory = course.category
    ? await prisma.course.findMany({
        where: { ...publicOthers, category: course.category },
        select: { ...courseCardSelect, id: true },
        orderBy: { createdAt: 'desc' },
        take: 3,
      })
    : [];
  const related =
    sameCategory.length >= 3
      ? sameCategory
      : [
          ...sameCategory,
          ...(await prisma.course.findMany({
            where: { ...publicOthers, id: { notIn: [course.id, ...sameCategory.map((c) => c.id)] } },
            select: { ...courseCardSelect, id: true },
            orderBy: { createdAt: 'desc' },
            take: 3 - sameCategory.length,
          })),
        ];

  // What checkout charges (src/app/api/checkout/route.ts).
  const charged = course.discountPrice ?? course.price;
  const discounted = course.discountPrice != null && course.discountPrice < course.price;
  const levelLabel = courseLevelLabel(tc, course.level);
  const deliveryLabel = courseDeliveryLabel(tc, course.deliveryType);
  // Latin digits keep numbers consistent with prices and the rest of /ar.
  const dateLocale = locale === 'ar' ? 'ar-OM-u-nu-latn' : 'en-GB';
  const formatDate = (d: Date) =>
    new Date(d).toLocaleDateString(dateLocale, { day: 'numeric', month: 'short', year: 'numeric' });
  // Counts render as plain strings so Arabic keeps Latin digits too.
  const count = (n: number) => ({ count: n, n: String(n) });
  const enrolled = course._count.enrollments;
  const lessonCount = course.lessons.length;
  const instructorName = course.instructor
    ? `${course.instructor.firstName ?? ''} ${course.instructor.lastName ?? ''}`.trim()
    : '';
  const initials = instructorName
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
  const videoUrl = videoEmbedUrl(course.marketingVideoUrl);
  const bullets = course.highlightBullets.map((b) => b.trim()).filter(Boolean);

  // The syllabus groups lessons by module in lesson order, as the lesson
  // viewer does.
  const modules = new Map<string, { id: string; title: string }[]>();
  for (const l of course.lessons) {
    const list = modules.get(l.moduleTitle) ?? [];
    list.push({ id: l.id, title: l.lessonTitle });
    modules.set(l.moduleTitle, list);
  }

  // When it runs: one value for the facts strip, one line for the side card.
  const selfPaced = course.courseFormat === 'SELF_PACED';
  const scheduleFact = selfPaced
    ? tc('scheduleSelfPaced')
    : course.scheduleStatus === 'TBC'
    ? tc('scheduleDatesTbc')
    : course.scheduleStatus === 'COMPLETED'
    ? tc('scheduleNextCohort')
    : course.startDate
    ? formatDate(course.startDate)
    : '';
  const datesLine = selfPaced
    ? ''
    : course.scheduleStatus === 'TBC'
    ? t('includesDatesTbc')
    : course.scheduleStatus === 'COMPLETED'
    ? t('includesNextCohort')
    : course.startDate && course.endDate
    ? t('includesDates', { start: formatDate(course.startDate), end: formatDate(course.endDate) })
    : course.startDate
    ? t('includesStarts', { date: formatDate(course.startDate) })
    : '';

  const facts = [
    { icon: BarChart3, label: t('factLevel'), value: levelLabel },
    { icon: Laptop, label: t('factFormat'), value: deliveryLabel },
    course.durationHours > 0 && { icon: Clock, label: t('factDuration'), value: tc('cardHours', count(course.durationHours)) },
    lessonCount > 0 && { icon: BookOpen, label: t('factLessons'), value: String(lessonCount) },
    scheduleFact && {
      icon: CalendarDays,
      label: course.startDate && course.scheduleStatus === 'SCHEDULED' && !selfPaced ? t('factStarts') : t('factSchedule'),
      value: scheduleFact,
    },
    instructorName && { icon: UserRound, label: t('factInstructor'), value: instructorName },
  ].filter(Boolean) as { icon: typeof Clock; label: string; value: string }[];

  const includes = [
    course.durationHours > 0 && { icon: Clock, text: t('hoursOfContent', count(course.durationHours)) },
    lessonCount > 0 && { icon: BookOpen, text: t('lessons', count(lessonCount)) },
    {
      icon: Laptop,
      text:
        course.deliveryType === 'ONLINE'
          ? t('includesOnline')
          : course.deliveryType === 'IN_PERSON'
          ? t('includesInPerson')
          : t('includesHybrid'),
    },
    {
      icon: Users,
      text: selfPaced ? t('includesSelfPaced') : course.courseFormat === 'WORKSHOP' ? t('includesWorkshop') : t('includesCohort'),
    },
    datesLine && { icon: CalendarDays, text: datesLine },
    course.location && course.deliveryType !== 'ONLINE' && { icon: MapPin, text: course.location, auto: true },
    // "No seats left" stays visible: it tells people the cohort is full.
    course.seatCapacity != null &&
      course.seatCapacity > 0 && {
        icon: Armchair,
        text: t('seatsLeft', count(Math.max(0, course.seatCapacity - enrolled))),
      },
  ].filter(Boolean) as { icon: typeof Clock; text: string; auto?: boolean }[];

  return (
    <main className="bg-canvas">
      {awaitingApproval && (
        <p
          role="status"
          className="border-b border-amber-200 bg-amber-50 px-4 py-3 text-center text-sm font-medium text-amber-900"
        >
          {t('awaitingApproval')}
        </p>
      )}

      {/* ── Header: breadcrumb, title, summary, key facts ── */}
      <section className="border-b border-hairline bg-canvas-card px-4 pt-8 pb-10 sm:px-6 md:pt-10 md:pb-12 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <nav aria-label={t('breadcrumbLabel')}>
            <ol className="flex flex-wrap items-center gap-1.5 text-sm text-ink-muted">
              <li>
                <Link href="/courses" className="transition-colors hover:text-teal-ink">
                  {t('breadcrumbCourses')}
                </Link>
              </li>
              {course.category && (
                <>
                  <li aria-hidden>
                    <ChevronRight size={14} className="rtl:rotate-180" />
                  </li>
                  <li>
                    <Link
                      href={{ pathname: '/courses', query: { category: course.category } }}
                      dir="auto"
                      className="transition-colors hover:text-teal-ink"
                    >
                      {course.category}
                    </Link>
                  </li>
                </>
              )}
            </ol>
          </nav>

          {/* Course copy comes from the database and is English-only for
              now; dir="auto" keeps it readable on /ar. */}
          <h1
            dir="auto"
            className="mt-5 max-w-4xl text-3xl font-semibold leading-[1.15] tracking-tight text-navy rtl:text-right md:text-[2.75rem]"
          >
            {course.title}
          </h1>
          <p dir="auto" className="mt-4 max-w-3xl text-base leading-relaxed text-ink-muted rtl:text-right md:text-lg">
            {course.shortDescription || t('fallbackDescription', { title: course.title })}
          </p>

          <dl className="mt-8 grid grid-cols-2 gap-x-6 gap-y-5 rounded-xl border border-hairline bg-canvas p-5 sm:grid-cols-3 lg:flex lg:flex-wrap lg:justify-between lg:gap-x-10">
            {facts.map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex min-w-0 items-start gap-3">
                <Icon size={18} aria-hidden className="mt-0.5 flex-shrink-0 text-teal-ink" />
                <div className="min-w-0">
                  <dt className="text-xs text-ink-muted">{label}</dt>
                  <dd className="mt-0.5 text-sm font-semibold text-navy">{value}</dd>
                </div>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* ── Body: content on the left, the enrolment card on the right ── */}
      <section className="px-4 py-12 sm:px-6 md:py-16 lg:px-8">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-12">
          {/* First in the DOM so phones see the price and enrol button
              before the long content; on desktop it sits on the right. */}
          <aside className="lg:col-start-2 lg:row-start-1 lg:self-start lg:sticky lg:top-24">
            <div className="overflow-hidden rounded-xl border border-hairline bg-canvas-card shadow-[0_12px_32px_-16px_rgba(1,28,65,0.2)]">
              {videoUrl ? (
                <div className="aspect-video bg-black">
                  <iframe
                    src={videoUrl}
                    title={t('previewTitle')}
                    className="h-full w-full"
                    loading="lazy"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              ) : (
                <CourseCover category={course.category} image={courseImage(course.thumbnail)} className="aspect-video" />
              )}

              <div className="space-y-5 p-6">
                <div>
                  <p className="text-sm text-ink-muted">{t('price')}</p>
                  <div className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <span className="text-3xl font-semibold tracking-tight text-navy">
                      {charged > 0 ? formatCoursePrice(charged) : t('free')}
                    </span>
                    {discounted && charged > 0 && (
                      <del className="text-base text-ink-muted">
                        <span className="sr-only">{t('originalPrice')} </span>
                        {formatCoursePrice(course.price)}
                      </del>
                    )}
                  </div>
                </div>

                <EnrollButton
                  courseId={course.id}
                  slug={course.slug}
                  price={charged}
                  state={enrollState}
                  bankPayee={brand.bankPayee}
                  receiptWhatsapp={brand.receiptWhatsapp}
                />

                <div className="border-t border-hairline pt-5">
                  <h2 className="text-sm font-semibold text-navy">{t('includesHeading')}</h2>
                  <ul className="mt-3 space-y-2.5 text-sm text-ink">
                    {includes.map(({ icon: Icon, text, auto }) => (
                      <li key={text} className="flex items-start gap-3">
                        <Icon size={16} aria-hidden className="mt-0.5 flex-shrink-0 text-teal-ink" />
                        <span dir={auto ? 'auto' : undefined}>{text}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </aside>

          <div className="min-w-0 space-y-12 lg:col-start-1 lg:row-start-1">
            {bullets.length > 0 && (
              <section aria-labelledby="learn-heading">
                <h2 id="learn-heading" className={SECTION_HEADING}>
                  {t('learnHeading')}
                </h2>
                <ul className="mt-5 grid gap-x-8 gap-y-3 rounded-xl border border-hairline bg-canvas-card p-6 sm:grid-cols-2">
                  {bullets.map((b, i) => (
                    <li key={i} className="flex items-start gap-3 text-[15px] leading-relaxed text-ink">
                      <Check size={18} aria-hidden className="mt-0.5 flex-shrink-0 text-teal-ink" />
                      <span dir="auto">{b}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {course.fullDescription && (
              <section aria-labelledby="about-heading">
                <h2 id="about-heading" className={SECTION_HEADING}>
                  {t('aboutHeading')}
                </h2>
                <p dir="auto" className="mt-4 whitespace-pre-line text-base leading-relaxed text-ink md:text-[17px]">
                  {course.fullDescription}
                </p>
              </section>
            )}

            {modules.size > 0 && (
              <section aria-labelledby="syllabus-heading">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h2 id="syllabus-heading" className={SECTION_HEADING}>
                    {t('syllabusHeading')}
                  </h2>
                  <p className="text-sm text-ink-muted">
                    {t('modules', count(modules.size))} · {t('lessons', count(lessonCount))}
                  </p>
                </div>
                <div className="mt-5 divide-y divide-hairline overflow-hidden rounded-xl border border-hairline bg-canvas-card">
                  {[...modules].map(([title, items], i) => (
                    <details key={title} open={i === 0} className="group">
                      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 text-start hover:bg-canvas">
                        <span className="flex min-w-0 items-baseline gap-3">
                          <span className="flex-shrink-0 text-sm font-semibold text-teal-ink">
                            {String(i + 1).padStart(2, '0')}
                          </span>
                          <span dir="auto" className="font-semibold text-navy">
                            {title}
                          </span>
                        </span>
                        <span className="flex flex-shrink-0 items-center gap-3 text-sm text-ink-muted">
                          {t('lessons', count(items.length))}
                          <ChevronRight
                            size={16}
                            aria-hidden
                            className="transition-transform duration-200 group-open:rotate-90 rtl:rotate-180 rtl:group-open:rotate-90"
                          />
                        </span>
                      </summary>
                      <ol className="space-y-2.5 px-5 pb-5 ps-12 text-[15px] text-ink">
                        {items.map((l) => (
                          <li key={l.id} className="flex items-start gap-3">
                            <span aria-hidden className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-teal/60" />
                            <span dir="auto">{l.title}</span>
                          </li>
                        ))}
                      </ol>
                    </details>
                  ))}
                </div>
              </section>
            )}

            {course.instructor && instructorName && (
              <section aria-labelledby="instructor-heading">
                <h2 id="instructor-heading" className={SECTION_HEADING}>
                  {t('instructorHeading')}
                </h2>
                <div className="mt-5 flex flex-col gap-5 rounded-xl border border-hairline bg-canvas-card p-6 sm:flex-row sm:items-start">
                  {course.instructor.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={course.instructor.image}
                      alt={instructorName}
                      className="h-20 w-20 flex-shrink-0 rounded-full object-cover"
                    />
                  ) : (
                    <div
                      aria-hidden
                      className="flex h-20 w-20 flex-shrink-0 items-center justify-center rounded-full bg-teal/10 text-xl font-semibold text-teal-ink"
                    >
                      {initials}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-lg font-semibold text-navy">{instructorName}</p>
                    <p className="text-sm text-ink-muted">{tc('instructorBadge')}</p>
                    {course.instructor.bio && (
                      <p dir="auto" className="mt-3 whitespace-pre-line text-[15px] leading-relaxed text-ink">
                        {course.instructor.bio}
                      </p>
                    )}
                  </div>
                </div>
              </section>
            )}
          </div>
        </div>
      </section>

      {related.length > 0 && (
        <section
          aria-labelledby="related-heading"
          className="border-t border-hairline px-4 py-12 sm:px-6 md:py-16 lg:px-8"
        >
          <div className="mx-auto max-w-7xl">
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <h2 id="related-heading" className={SECTION_HEADING}>
                {t('relatedHeading')}
              </h2>
              <Link href="/courses" className="text-sm font-medium text-teal-ink underline-offset-4 hover:underline">
                {t('relatedAll')}
              </Link>
            </div>
            <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((c) => (
                <CourseCard key={c.id} course={c} locale={locale} />
              ))}
            </div>
          </div>
        </section>
      )}
    </main>
  );
}
