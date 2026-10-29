import { z } from 'zod';
import { PASSWORD_MIN_LENGTH } from '@/lib/password';

/**
 * Emails are stored trimmed and lower-case. The column is case-sensitive, so
 * "Jane@x.com" and "jane@x.com" used to be two accounts, and logging in with
 * the other casing failed.
 */
export const emailField = z.string().trim().toLowerCase().email('Invalid email address');

export const registerSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(50),
  lastName: z.string().min(1, 'Last name is required').max(50),
  email: emailField,
  password: z.string().min(PASSWORD_MIN_LENGTH, `Password must be at least ${PASSWORD_MIN_LENGTH} characters`).max(100),
  confirmPassword: z.string().min(1, 'Please confirm your password'),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

export const leadSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(50),
  lastName: z.string().min(1, 'Last name is required').max(50),
  email: emailField,
  phone: z.string().max(30).optional().nullable(),
  company: z.string().max(120).optional().nullable(),
  tourType: z.string().max(200).optional().default('General Enquiry'),
  message: z.string().min(1, 'Message is required').max(5000),
  source: z.string().max(100).optional(),
});

export const courseSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  slug: z.string().min(1, 'Slug is required').max(200),
  shortDescription: z.string().min(1, 'Short description is required').max(500),
  fullDescription: z.string().min(1, 'Full description is required').max(10000),
  deliveryType: z.enum(['ONLINE', 'IN_PERSON', 'HYBRID']),
  category: z.string().min(1).max(100),
  level: z.string().min(1).max(50),
  price: z.coerce.number().min(0),
  discountPrice: z.coerce.number().min(0).optional().nullable(),
  durationHours: z.coerce.number().int().min(1),
  startDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
  seatCapacity: z.coerce.number().int().min(1).optional().nullable(),
  location: z.string().max(200).optional().nullable(),
  thumbnail: z.string().url().optional().nullable().or(z.literal('')),
  marketingVideoUrl: z.string().url().optional().nullable().or(z.literal('')),
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED', 'DELETED']).optional(),
  // Undeclared keys are stripped by zod, so these must be listed or the
  // admin's choice of instructor, format and schedule is silently lost.
  instructorId: z.string().min(1).optional().nullable().or(z.literal('')),
  courseFormat: z.enum(['COHORT', 'SELF_PACED', 'WORKSHOP']).optional().or(z.literal('')),
  scheduleStatus: z.enum(['SCHEDULED', 'TBC', 'COMPLETED']).optional().or(z.literal('')),
  // Featured slot on the home-page NeuralPathway. 1–3 = featured; null = not featured.
  // The form's "None" option sends '', which must mean null: coercing it gave
  // 0, failed min(1), and blocked creating any course that wasn't featured.
  featuredSlot: z.preprocess(
    (v) => (v === '' ? null : v),
    z.coerce.number().int().min(1).max(3).nullable().optional(),
  ),
  // "What you'll learn" overrides — used when the course is featured.
  // All optional; falls back to NeuralPathway's slot defaults if absent.
  highlightStatValue: z.string().max(40).optional().nullable().or(z.literal('')),
  highlightStatLabel: z.string().max(40).optional().nullable().or(z.literal('')),
  highlightBullets: z.array(z.string().max(120)).max(6).optional(),
}).refine((data) => {
  if (data.startDate && data.endDate) {
    return new Date(data.endDate) >= new Date(data.startDate);
  }
  return true;
}, {
  message: "End date cannot be earlier than start date",
  path: ["endDate"],
});

/**
 * Adds https:// to a pasted link that has no scheme ("youtu.be/abc",
 * "www.youtube.com/..."). Without it the URL check failed and the builder
 * threw away the whole lesson the instructor had typed.
 */
export function withScheme(value: unknown) {
  if (typeof value !== 'string') return value;
  const v = value.trim();
  return v && !/^[a-z][a-z0-9+.-]*:/i.test(v) ? `https://${v}` : value;
}

/**
 * Why a quiz could not be completed as saved, or null when it can. Learners
 * finish a quiz by answering every question correctly, so each question needs
 * text, at least two options and a correct option that isn't blank.
 */
export function quizProblem(lessonType: unknown, questions: unknown): string | null {
  if (lessonType !== 'QUIZ') return null;
  if (!Array.isArray(questions) || questions.length === 0) {
    return 'Add at least one question to the quiz.';
  }
  for (const [i, q] of questions.entries()) {
    const options: unknown[] = Array.isArray(q?.options) ? q.options : [];
    const filled = (o: unknown) => typeof o === 'string' && o.trim().length > 0;
    if (!filled(q?.question)) return `Question ${i + 1} needs text.`;
    if (options.filter(filled).length < 2) return `Question ${i + 1} needs at least two answer options.`;
    if (!filled(options[q.correctIndex])) return `Question ${i + 1}: the correct answer can't be blank.`;
  }
  return null;
}

export const lessonSchema = z.object({
  courseId: z.string().min(1),
  moduleTitle: z.string().min(1, 'Module title is required').max(200),
  lessonTitle: z.string().min(1, 'Lesson title is required').max(200),
  lessonType: z.enum(['CONTENT', 'QUIZ']).optional(),
  videoUrl: z.preprocess(withScheme, z.string().url().optional().nullable().or(z.literal(''))),
  content: z.string().max(50000).optional().nullable(),
  resources: z.string().max(5000).optional().nullable(),
  questions: z.any().optional().nullable(),
  orderIndex: z.coerce.number().int().min(0),
});

export const profileSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(50),
  lastName: z.string().min(1, 'Last name is required').max(50),
  bio: z.string().max(2000).optional().nullable(),
});

export const templateSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  type: z.string().min(1).max(50),
  subject: z.string().min(1, 'Subject is required').max(300),
  body: z.string().min(1, 'Body is required').max(10000),
  variables: z.string().max(1000).optional().nullable(),
  isActive: z.boolean().optional(),
});

/**
 * An instructor's commission share in percent, or null when the value is not
 * a number from 0 to 100. An emptied input arrives as null (NaN in JSON), and
 * Number(null) silently saved 0%.
 */
export function parseCommissionRate(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 100
    ? value
    : null;
}

export function formatZodError(error: z.ZodError): string {
  return error.issues.map(e => e.message).join(', ');
}

// Allow-list of fields the Course Prisma model accepts on create/update.
// Anything not in this list is dropped before reaching Prisma so stray
// form-state fields (e.g. helper inputs like highlightBullet1) can't
// throw "Unknown argument" errors.
const COURSE_WRITE_FIELDS = new Set([
  'title', 'slug', 'shortDescription', 'fullDescription',
  'deliveryType', 'courseFormat', 'scheduleStatus',
  'category', 'level',
  'price', 'discountPrice', 'durationHours',
  'startDate', 'endDate', 'seatCapacity', 'location',
  'instructorId', 'thumbnail', 'marketingVideoUrl',
  'status', 'approvalStatus', 'rejectionReason',
  'featuredSlot',
  'highlightStatValue', 'highlightStatLabel', 'highlightBullets',
]);

export function normalizeCourseData(data: any) {
  // Defensive: drop unknown keys so Prisma doesn't reject the whole
  // write. Form components sometimes carry transient state fields
  // (per-bullet inputs, UI toggles) that have no DB column.
  const normalized: any = {};
  for (const k of Object.keys(data || {})) {
    if (COURSE_WRITE_FIELDS.has(k)) normalized[k] = data[k];
  }
  if (typeof normalized.startDate === 'string' && normalized.startDate) {
    normalized.startDate = new Date(normalized.startDate);
  }
  if (typeof normalized.endDate === 'string' && normalized.endDate) {
    normalized.endDate = new Date(normalized.endDate);
  }
  // "No instructor" arrives as '' from a <select>; the column needs null.
  if (normalized.instructorId === '') normalized.instructorId = null;
  // courseFormat / scheduleStatus — drop empty strings so the DB
  // defaults kick in. Both are enums on the Prisma side; sending an
  // empty string would fail enum validation.
  if (normalized.courseFormat === '' || normalized.courseFormat == null) {
    delete normalized.courseFormat;
  }
  if (normalized.scheduleStatus === '' || normalized.scheduleStatus == null) {
    delete normalized.scheduleStatus;
  }
  // When format = SELF_PACED, dates are meaningless. Clear them so the
  // catalog renders "Available now" instead of stale dates.
  if (normalized.courseFormat === 'SELF_PACED') {
    normalized.startDate = null;
    normalized.endDate = null;
  }
  // When schedule is TBC, clear dates too — they're explicitly "not
  // set yet" rather than a stale value from a previous cohort.
  if (normalized.scheduleStatus === 'TBC') {
    normalized.startDate = null;
    normalized.endDate = null;
  }
  // featuredSlot: <select> uses "" for "None" — coerce to null so the DB
  // unique-nullable column stays valid. Numeric strings ("1") become ints.
  if (normalized.featuredSlot === '' || normalized.featuredSlot === undefined) {
    normalized.featuredSlot = null;
  } else if (typeof normalized.featuredSlot === 'string') {
    const parsed = parseInt(normalized.featuredSlot, 10);
    normalized.featuredSlot = Number.isNaN(parsed) ? null : parsed;
  }
  // Highlight stat strings: empty → null so we don't render empty <p> tags.
  if (normalized.highlightStatValue === '') normalized.highlightStatValue = null;
  if (normalized.highlightStatLabel === '') normalized.highlightStatLabel = null;
  // Bullets: drop empties + trim whitespace. Postgres String[] doesn't allow
  // undefined → coerce to empty array so writes always work.
  if (Array.isArray(normalized.highlightBullets)) {
    normalized.highlightBullets = normalized.highlightBullets
      .map((b: unknown) => (typeof b === 'string' ? b.trim() : ''))
      .filter((b: string) => b.length > 0);
  } else if (normalized.highlightBullets == null) {
    normalized.highlightBullets = [];
  }
  return normalized;
}
