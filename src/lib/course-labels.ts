/**
 * Translated labels for a course's level and delivery type.
 *
 * Level is stored as display text ('Beginner'); delivery as an enum
 * ('IN_PERSON'). Both map onto keys in the `coursesPage` namespace and fall
 * back to the raw value for anything new the admin portal adds.
 */
const LEVEL_KEY: Record<string, string> = {
  beginner: 'levelBeginner',
  intermediate: 'levelIntermediate',
  advanced: 'levelAdvanced',
};

const DELIVERY_KEY: Record<string, string> = {
  ONLINE: 'deliveryOnline',
  IN_PERSON: 'deliveryInPerson',
  HYBRID: 'deliveryHybrid',
};

type Translate = (key: string) => string;

export function courseLevelLabel(t: Translate, level: string): string {
  const key = LEVEL_KEY[level.toLowerCase()];
  return key ? t(key) : level;
}

export function courseDeliveryLabel(t: Translate, deliveryType: string): string {
  const key = DELIVERY_KEY[deliveryType];
  return key ? t(key) : deliveryType.replace('_', ' ');
}

type ScheduledCourse = {
  courseFormat: string;
  scheduleStatus: string;
  startDate: Date | null;
};

/**
 * One line saying when a course runs, from its format, schedule status and
 * start date:
 *   SELF_PACED                 → "Self-paced"
 *   COHORT/WORKSHOP, TBC       → "Dates TBC"
 *   COHORT/WORKSHOP, COMPLETED → "Next cohort TBA"
 *   COHORT with a start date   → "Starts 1 Apr"
 *   WORKSHOP with a date       → "1 Apr"
 *   anything else              → '' (callers hide the line)
 */
export function courseScheduleLabel(t: Translate, course: ScheduledCourse, locale: string): string {
  if (course.courseFormat === 'SELF_PACED') return t('scheduleSelfPaced');
  if (course.scheduleStatus === 'TBC') return t('scheduleDatesTbc');
  if (course.scheduleStatus === 'COMPLETED') return t('scheduleNextCohort');
  if (!course.startDate) return '';
  // The visitor's language, not the server's; Latin digits match the prices.
  const d = new Date(course.startDate).toLocaleDateString(
    locale === 'ar' ? 'ar-OM-u-nu-latn' : 'en-GB',
    { day: 'numeric', month: 'short' },
  );
  return course.courseFormat === 'WORKSHOP' ? d : `${t('scheduleStarts')} ${d}`;
}
