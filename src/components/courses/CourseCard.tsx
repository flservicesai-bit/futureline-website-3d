import { Link } from '@/i18n/routing';
import { getTranslations } from 'next-intl/server';
import { BookOpen, CalendarDays, Clock } from 'lucide-react';
import { formatCoursePrice } from '@/lib/utils';
import { courseDeliveryLabel, courseLevelLabel, courseScheduleLabel } from '@/lib/course-labels';
import { courseImage } from '@/lib/course-image';
import { CourseCover } from './CourseCover';

export type CourseCardData = {
  slug: string;
  title: string;
  shortDescription: string | null;
  category: string | null;
  level: string;
  deliveryType: string;
  courseFormat: string;
  scheduleStatus: string;
  startDate: Date | null;
  durationHours: number;
  price: number;
  discountPrice: number | null;
  thumbnail: string | null;
  instructor: { firstName: string | null; lastName: string | null; image: string | null } | null;
  _count: { lessons: number };
};

/** The fields CourseCard reads, for a Prisma `select`. */
export const courseCardSelect = {
  slug: true,
  title: true,
  shortDescription: true,
  category: true,
  level: true,
  deliveryType: true,
  courseFormat: true,
  scheduleStatus: true,
  startDate: true,
  durationHours: true,
  price: true,
  discountPrice: true,
  thumbnail: true,
  instructor: { select: { firstName: true, lastName: true, image: true } },
  _count: { select: { lessons: true } },
} as const;

/** A course in the catalogue grid and in "More courses" on a course page. */
export async function CourseCard({
  course,
  locale,
  enrolled = false,
}: {
  course: CourseCardData;
  locale: string;
  /** Enrolled learners go straight to the course and see "Continue". */
  enrolled?: boolean;
}) {
  const t = await getTranslations({ locale, namespace: 'coursesPage' });
  // Counts render as plain strings so Arabic keeps Latin digits.
  const count = (n: number) => ({ count: n, n: String(n) });

  const href = enrolled ? `/dashboard/course/${course.slug}` : `/courses/${course.slug}`;
  // What checkout charges (src/app/api/checkout/route.ts).
  const charged = course.discountPrice ?? course.price;
  const discounted = course.discountPrice != null && course.discountPrice < course.price;
  const schedule = courseScheduleLabel(t, course, locale);
  const lessons = course._count.lessons;
  const instructorName = course.instructor
    ? `${course.instructor.firstName ?? ''} ${course.instructor.lastName ?? ''}`.trim()
    : '';
  const initials = instructorName
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const badge =
    'rounded-full bg-white/95 px-2.5 py-1 text-xs font-medium text-navy shadow-sm';

  return (
    <Link
      href={href}
      data-cursor="hover"
      className="group flex h-full flex-col overflow-hidden rounded-xl border border-hairline bg-canvas-card shadow-[0_1px_2px_rgba(1,28,65,0.04)] transition duration-200 hover:-translate-y-0.5 hover:border-teal/40 hover:shadow-[0_12px_32px_-12px_rgba(1,28,65,0.18)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal"
    >
      <CourseCover category={course.category} image={courseImage(course.thumbnail)} className="aspect-[16/9]">
        <div className="absolute start-3 top-3 flex flex-wrap gap-1.5">
          <span className={badge}>{courseLevelLabel(t, course.level)}</span>
          <span className={badge}>{courseDeliveryLabel(t, course.deliveryType)}</span>
        </div>
        {enrolled && (
          <span className="absolute end-3 top-3 rounded-full bg-teal px-2.5 py-1 text-xs font-medium text-white shadow-sm">
            {t('cardEnrolled')}
          </span>
        )}
      </CourseCover>

      <div className="flex flex-1 flex-col p-5">
        <div className="flex-1 pb-5">
          {/* Course copy is English-only in the database for now: dir="auto"
              keeps it in reading order on /ar, rtl:text-right keeps it
              aligned with the Arabic around it. */}
          <h3
            dir="auto"
            className="text-lg font-semibold leading-snug tracking-tight text-navy transition-colors group-hover:text-teal-ink rtl:text-right"
          >
            {course.title}
          </h3>
          {course.shortDescription && (
            <p dir="auto" className="mt-2 line-clamp-2 text-sm leading-relaxed text-ink-muted rtl:text-right">
              {course.shortDescription}
            </p>
          )}

          <ul className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[13px] text-ink-muted">
            {course.durationHours > 0 && (
              <li className="flex items-center gap-1.5">
                <Clock size={14} aria-hidden className="text-teal-ink" />
                {t('cardHours', count(course.durationHours))}
              </li>
            )}
            {lessons > 0 && (
              <li className="flex items-center gap-1.5">
                <BookOpen size={14} aria-hidden className="text-teal-ink" />
                {t('cardLessons', count(lessons))}
              </li>
            )}
            {schedule && (
              <li className="flex items-center gap-1.5">
                <CalendarDays size={14} aria-hidden className="text-teal-ink" />
                {schedule}
              </li>
            )}
          </ul>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-hairline pt-4">
          {instructorName ? (
            <span className="flex min-w-0 items-center gap-2 text-sm text-ink">
              {course.instructor?.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={course.instructor.image} alt="" className="h-7 w-7 flex-shrink-0 rounded-full object-cover" />
              ) : (
                <span
                  aria-hidden
                  className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-teal/10 text-[11px] font-semibold text-teal-ink"
                >
                  {initials}
                </span>
              )}
              <span className="truncate">
                <span className="sr-only">{t('cardTaughtBy')} </span>
                {instructorName}
              </span>
            </span>
          ) : (
            <span />
          )}

          <span className="flex flex-shrink-0 items-baseline gap-2">
            {enrolled ? (
              <span className="text-sm font-semibold text-teal-ink">{t('cardContinue')}</span>
            ) : charged <= 0 ? (
              <span className="text-base font-semibold text-navy">{t('cardFree')}</span>
            ) : (
              <>
                {discounted && (
                  <del className="text-xs text-ink-muted">
                    <span className="sr-only">{t('originalPrice')} </span>
                    {formatCoursePrice(course.price)}
                  </del>
                )}
                <span className="text-base font-semibold text-navy">{formatCoursePrice(charged)}</span>
              </>
            )}
          </span>
        </div>
      </div>
    </Link>
  );
}
