import { Link } from '@/i18n/routing';
import { getLocale, getTranslations } from 'next-intl/server';
import { prisma } from '@/lib/prisma';
import { Search, ArrowRight, Clock, Check, X, Layers } from 'lucide-react';
import { formatPrice } from '@/lib/utils';
import CourseEnquiryForm from '@/components/CourseEnquiryForm';
import { AnimatedText } from '@/components/ui/AnimatedText';
import { FadeUp } from '@/components/motion/FadeUp';
import { metadataFor } from '@/lib/seo';
import { courseDeliveryLabel, courseLevelLabel } from '@/lib/course-labels';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { SectionEyebrow } from '@/components/ui/SectionEyebrow';
import { BrandedHeading } from '@/components/ui/BrandedHeading';

export const dynamic = 'force-dynamic';

// The Course.deliveryType enum; any other ?type= value is ignored.
const DELIVERY_TYPES = ['ONLINE', 'IN_PERSON', 'HYBRID'] as const;

export const generateMetadata = metadataFor('courses', '/courses');

const PILL_CLASS =
  'rounded-full border px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.25em] transition-colors';

function pillClass(active: boolean) {
  return active
    ? `${PILL_CLASS} border-academy/50 bg-academy/10 text-academy`
    : `${PILL_CLASS} border-hairline text-ink-muted hover:border-hairline hover:text-navy`;
}

export default async function CoursesPage({
  searchParams,
}: {
  searchParams: Promise<Record<'level' | 'category' | 'search' | 'tab' | 'type', string | string[] | undefined>>;
}) {
  const session = await getServerSession(authOptions);
  const t = await getTranslations('coursesPage');
  const locale = await getLocale();
  // URLs are user input: a repeated key (?level=a&level=b) arrives as an array
  // and an unknown ?type= is not a valid enum. Either one used to reach Prisma
  // and crash the page, so normalise them before anything reads them.
  const raw = await searchParams;
  const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const type = first(raw.type)?.toUpperCase();
  const params = {
    level: first(raw.level),
    category: first(raw.category),
    search: first(raw.search),
    tab: first(raw.tab),
    type: type && (DELIVERY_TYPES as readonly string[]).includes(type) ? type : undefined,
  };
  const activeTab = params.tab || 'all';

  // Static marketing copy lives in the coursesPage translation namespace.
  const pillars = t.raw('pillars') as {
    name: string;
    pitch: string;
    sectors: string[];
    earn: string;
    roles: string[];
    demand: string;
  }[];
  const vsRows = t.raw('vsRows') as { label: string; others: string; fl: string }[];
  const teamsItems = t.raw('teamsItems') as string[];
  const faqs = t.raw('faqs') as { q: string; a: string }[];

  // Base filter: published + approved + NOT the placeholder "Test"
  // course. (The Test course was leaking to production — defensive
  // filter here even if a future deploy fixes the DB status.)
  const baseFilter = {
    status: 'PUBLISHED' as const,
    approvalStatus: 'APPROVED' as const,
    NOT: { title: { equals: 'Test', mode: 'insensitive' as const } },
  };

  const where: any = { ...baseFilter };

  if (activeTab === 'enrolled' && session?.user?.id) {
    where.enrollments = { some: { userId: session.user.id } };
  }
  if (params.level) where.level = params.level;
  if (params.category) where.category = params.category;
  if (params.type) where.deliveryType = params.type;
  if (params.search) {
    where.OR = [
      { title: { contains: params.search, mode: 'insensitive' } },
      { shortDescription: { contains: params.search, mode: 'insensitive' } },
      { category: { contains: params.search, mode: 'insensitive' } },
    ];
  }

  // Catalog appears above the marketing copy. We intentionally don't expose
  // a total course count anywhere — this is a CMS-driven catalog where
  // courses come and go, so the count is meaningless as marketing surface.
  // Instructors are queried independently so the "Who teaches" authority
  // band can render every practitioner with a published, approved course.
  const [courses, categoryRows, instructors] = await Promise.all([
    prisma.course.findMany({
      where,
      include: {
        instructor: { select: { firstName: true, lastName: true } },
        enrollments: session?.user?.id ? { where: { userId: session.user.id } } : false,
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.course.findMany({
      where: baseFilter,
      select: { category: true },
      distinct: ['category'],
    }),
    // All active instructors — not constrained by course relationship.
    // The admin manually adds Practitioners and expects them to surface
    // here. If a practitioner shouldn't appear, admin uses the active
    // toggle on /admin/instructors to disable them.
    prisma.user.findMany({
      where: {
        role: 'INSTRUCTOR',
        isActive: true,
      },
      select: { id: true, firstName: true, lastName: true, bio: true, image: true },
      orderBy: { firstName: 'asc' },
    }),
  ]);

  const categories = categoryRows.map((r) => r.category).filter(Boolean) as string[];

  function buildHref(overrides: Record<string, string | undefined>) {
    const next: Record<string, string> = {};
    const fields = ['search', 'level', 'category', 'type', 'tab'] as const;
    for (const f of fields) {
      const ov = overrides[f];
      const cur = params[f];
      if (ov === undefined) {
        if (cur) next[f] = cur;
      } else if (ov !== '') {
        next[f] = ov;
      }
    }
    const qs = new URLSearchParams(next).toString();
    return `/courses${qs ? `?${qs}` : ''}`;
  }

  // No PageScrollSpy on this page — its left-edge label overlaps the
  // catalog header content on narrower viewports. The page is content-
  // led (cards first, marketing sections second), users scroll naturally.

  return (
    <main className="bg-canvas">
      {/* ── Catalog (page top — compact header + cards) ──
          Replaced the giant 3D hero with a tight inline header so the
          first row of course cards is visible above the fold on any
          laptop viewport. The marketing copy (Why / Process / Compare /
          FAQ) lives below the cards for buyers who scroll. */}
      <section
        id="catalog"
        className="scroll-mt-24 px-4 pt-8 pb-16 sm:px-6 md:pt-12 md:pb-20 lg:px-8"
      >
        <div className="mx-auto max-w-7xl">
          {/* Page header — eyebrow + branded H1 + subhead, all centered. */}
          <div className="mx-auto mb-8 max-w-4xl text-center md:mb-10">
            <p className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-[0.4em] text-academy">
              <span
                aria-hidden
                className="block h-1.5 w-1.5 rounded-full bg-academy shadow-[0_0_10px_2px_rgba(91,123,251,0.55)]"
              />
              {t('eyebrow')}
            </p>
            <BrandedHeading as="h1" size="xl" className="mt-3">
              {t('heading')}
            </BrandedHeading>
            <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-ink-muted md:text-base">
              {t('subhead')}
            </p>
          </div>

          {/* Filters (left sticky rail) + cards (right) ──────────────
              Moved filters into a dedicated 240px sidebar on lg+ so the
              cards grid sits at the top of its column with no preamble.
              On smaller viewports the grid collapses to one column and
              the filters stack above the cards. */}
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-[240px_1fr] lg:gap-12">

            <aside
              aria-label="Course filters"
              className="lg:sticky lg:top-24 lg:self-start lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto lg:pr-2"
            >
              <div className="flex flex-col gap-6">
                {/* Search */}
                {/* Locale-prefixed action: a bare /courses redirects to the
                    default locale, which sent Arabic searches to /en. */}
                <form method="GET" action={`/${locale}/courses`} className="w-full" role="search">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" size={14} />
                    <input
                      type="search"
                      name="search"
                      defaultValue={params.search}
                      aria-label={t('searchPlaceholder')}
                      placeholder={t('searchPlaceholder')}
                      className="fl-input w-full !py-2 !pl-9 !text-xs"
                    />
                  </div>
                  {params.level && <input type="hidden" name="level" value={params.level} />}
                  {params.category && <input type="hidden" name="category" value={params.category} />}
                  {params.type && <input type="hidden" name="type" value={params.type} />}
                </form>

                {/* Level */}
                <div className="flex flex-col gap-2.5">
                  <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-ink-muted">{t('levelLabel')}</span>
                  <div className="flex flex-wrap gap-2">
                    <Link href={buildHref({ level: '' })} className={pillClass(!params.level)} data-cursor="hover">{t('filterAll')}</Link>
                    {[
                      { v: 'Beginner', label: t('levelBeginner') },
                      { v: 'Intermediate', label: t('levelIntermediate') },
                      { v: 'Advanced', label: t('levelAdvanced') },
                    ].map((lvl) => (
                      <Link
                        key={lvl.v}
                        href={buildHref({ level: lvl.v })}
                        className={pillClass(params.level === lvl.v)}
                        data-cursor="hover"
                      >
                        {lvl.label}
                      </Link>
                    ))}
                  </div>
                </div>

                {/* Category */}
                {categories.length > 0 && (
                  <div className="flex flex-col gap-2.5">
                    <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-ink-muted">{t('categoryLabel')}</span>
                    <div className="flex flex-wrap gap-2">
                      <Link href={buildHref({ category: '' })} className={pillClass(!params.category)} data-cursor="hover">{t('filterAll')}</Link>
                      {categories.map((cat) => (
                        <Link
                          key={cat}
                          href={buildHref({ category: cat })}
                          className={pillClass(params.category === cat)}
                          data-cursor="hover"
                        >
                          {cat}
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {/* Delivery */}
                <div className="flex flex-col gap-2.5">
                  <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-ink-muted">{t('deliveryLabel')}</span>
                  <div className="flex flex-wrap gap-2">
                    <Link href={buildHref({ type: '' })} className={pillClass(!params.type)} data-cursor="hover">{t('filterAll')}</Link>
                    {[
                      { v: 'ONLINE', label: t('deliveryOnline') },
                      { v: 'IN_PERSON', label: t('deliveryInPerson') },
                      { v: 'HYBRID', label: t('deliveryHybrid') },
                    ].map((d) => (
                      <Link
                        key={d.v}
                        href={buildHref({ type: d.v })}
                        className={pillClass(params.type === d.v)}
                        data-cursor="hover"
                      >
                        {d.label}
                      </Link>
                    ))}
                  </div>
                </div>

                {/* Auth-gated tabs */}
                {session?.user && (
                  <div className="flex flex-col gap-2.5 border-t border-hairline pt-5">
                    <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-ink-muted">{t('viewLabel')}</span>
                    <div className="flex flex-col gap-1">
                      {[
                        { key: 'all', label: t('viewAll') },
                        { key: 'enrolled', label: t('viewEnrolled') },
                      ].map(({ key, label }) => (
                        <Link
                          key={key}
                          href={`/courses?tab=${key}`}
                          className={`py-1 text-sm transition-colors ${
                            activeTab === key
                              ? 'text-academy'
                              : 'text-ink-muted hover:text-navy'
                          }`}
                          data-cursor="hover"
                        >
                          {label}
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </aside>

            {/* Cards column */}
            <div>
              {courses.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-32 text-center">
                  <p className="font-mono text-xs uppercase tracking-[0.3em] text-ink-muted">{t('emptyTitle')}</p>
                  <p className="mt-3 text-sm text-ink-muted">{t('emptyBody')}</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {courses.map((course, i) => {
                const isEnrolled = course.enrollments && course.enrollments.length > 0;
                const href = isEnrolled ? `/dashboard/course/${course.slug}` : `/courses/${course.slug}`;
                const priceLabel =
                  isEnrolled ? t('cardContinue') : course.price > 0 ? formatPrice(course.discountPrice ?? course.price) : t('cardFree');
                const num = String(i + 1).padStart(2, '0');
                const instructorName = course.instructor
                  ? `${course.instructor.firstName ?? ''} ${course.instructor.lastName ?? ''}`.trim()
                  : '';

                // Schedule chip — single line of text computed from
                // courseFormat + scheduleStatus + startDate.
                //   SELF_PACED            → "Self-paced"
                //   COHORT/WORKSHOP TBC   → "Dates TBC"
                //   COHORT/WORKSHOP DONE  → "Next cohort TBA"
                //   COHORT SCHEDULED + dt → "Starts <date>"
                //   WORKSHOP SCHEDULED + dt → "<date>"
                //   fallback              → empty (don't render the chip)
                const scheduleChip = (() => {
                  if (course.courseFormat === 'SELF_PACED') return t('scheduleSelfPaced');
                  if (course.scheduleStatus === 'TBC') return t('scheduleDatesTbc');
                  if (course.scheduleStatus === 'COMPLETED') return t('scheduleNextCohort');
                  if (course.startDate) {
                    const d = new Date(course.startDate).toLocaleDateString(undefined, {
                      day: 'numeric', month: 'short',
                    });
                    return course.courseFormat === 'WORKSHOP' ? d : `${t('scheduleStarts')} ${d}`;
                  }
                  return '';
                })();

                return (
                  <Link
                    key={course.id}
                    href={href}
                    data-cursor="hover"
                    className="group flex h-full flex-col overflow-hidden rounded-md border border-hairline bg-canvas-card p-7 backdrop-blur-sm transition-colors duration-300 hover:border-academy/40 hover:bg-canvas-card"
                  >
                    <div className="mb-6 flex items-baseline justify-between">
                      <span className="font-mono text-[11px] uppercase tracking-[0.3em] text-academy">{num}</span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-ink-muted">
                          {courseLevelLabel(t, course.level)}
                        </span>
                        <span className="rounded-full border border-academy/30 bg-academy/10 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.2em] text-academy">
                          {courseDeliveryLabel(t, course.deliveryType)}
                        </span>
                      </div>
                    </div>
                    {/* Course copy is English-only in the database for now;
                        dir="auto" keeps it in reading order on /ar. */}
                    <h3
                      dir="auto"
                      className="text-xl font-semibold leading-[1.15] tracking-[-0.01em] text-navy transition-colors group-hover:text-academy-light"
                    >
                      {course.title}
                    </h3>
                    <p dir="auto" className="mt-4 text-sm leading-relaxed text-ink-muted line-clamp-3">
                      {course.shortDescription}
                    </p>
                    {/* Instructor strip — shows "Taught by [name]" when an
                        instructor is attached. Backs the hero's "We teach what
                        we practice." claim with a concrete name per course. */}
                    {instructorName && (
                      <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.25em] text-ink-muted">
                        {t('cardTaughtBy')} <span className="text-academy/90">{instructorName}</span>
                      </p>
                    )}
                    {/* Schedule chip — shows "Starts <date>" /
                        "Self-paced" / "Dates TBC" / "Next cohort TBA"
                        depending on the course's format + status. Empty
                        for COHORT courses with SCHEDULED status but no
                        start date set (those would have rendered nothing
                        in the old design too). */}
                    {scheduleChip && (
                      <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.25em] text-academy/80">
                        {scheduleChip}
                      </p>
                    )}
                    <div className="mt-auto flex items-center justify-between border-t border-hairline pt-4">
                      <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.25em] text-ink-muted">
                        <Clock size={11} /> {course.durationHours}{t('hoursSuffix')}
                      </span>
                      <span className="flex items-center gap-2 text-sm font-semibold text-navy">
                        {priceLabel}
                        <ArrowRight size={13} className="text-ink-muted transition-all group-hover:translate-x-1 group-hover:text-academy" />
                      </span>
                    </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── Where these skills get paid (per-pillar payoff cards) ──
          Replaces the old vague "Skills the market actually pays for"
          stat grid. Answers the two questions a buyer actually has:
          where do I apply this skill, and what roles does it unlock?
          All numbers stripped on request — directional qualitative
          language only. Sectors + role names + demand sentence per
          pillar, in a parallel-shape grid. */}
      <section
        id="where-it-pays"
        className="scroll-mt-24 border-t border-hairline px-4 py-16 sm:px-6 md:py-20 lg:px-8"
      >
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto mb-10 max-w-3xl text-center md:mb-14">
            <SectionEyebrow accent="academy">{t('whereEyebrow')}</SectionEyebrow>
            <BrandedHeading as="h2" size="lg" className="mt-3">
              {t('whereHeading')}
            </BrandedHeading>
            <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-ink md:text-lg">
              {t('whereLede')}
            </p>
          </div>
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            {pillars.map((p, i) => (
              <FadeUp key={p.name} delay={i * 0.08}>
                <article className="flex h-full flex-col rounded-md border border-hairline bg-canvas-card p-7 backdrop-blur-sm md:p-9">
                  <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-academy">
                    {p.name}
                  </p>
                  <h3 className="mt-4 text-2xl font-semibold leading-[1.15] tracking-tight text-navy md:text-3xl">
                    {p.pitch}
                  </h3>

                  <div className="mt-7 grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-x-10">
                    <div>
                      <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-ink-muted">
                        {t('whereApplied')}
                      </p>
                      <p className="mt-3 text-sm leading-relaxed text-ink md:text-base">
                        {p.sectors.join(' · ')}
                      </p>
                    </div>
                    <div>
                      <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-ink-muted">
                        {t('whatItPays')}
                      </p>
                      <p className="mt-3 text-sm leading-relaxed text-ink md:text-base">
                        {p.earn}
                      </p>
                    </div>
                  </div>

                  <div className="mt-7">
                    <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-ink-muted">
                      {t('rolesLabel')}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {p.roles.map((role) => (
                        <span
                          key={role}
                          className="rounded-full border border-academy/30 bg-academy/10 px-3 py-1.5 text-xs font-medium text-academy md:text-[13px]"
                        >
                          {role}
                        </span>
                      ))}
                    </div>
                  </div>

                  <p className="mt-7 border-t border-hairline pt-5 text-sm italic leading-relaxed text-ink-muted md:text-[15px]">
                    {p.demand}
                  </p>
                </article>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it compares (Others vs FutureLine) ── */}
      <section
        id="how-it-compares"
        className="scroll-mt-24 border-t border-hairline px-4 py-16 sm:px-6 md:py-20 lg:px-8"
      >
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto mb-8 max-w-3xl text-center md:mb-12">
            <SectionEyebrow accent="academy">{t('compareEyebrow')}</SectionEyebrow>
            <BrandedHeading as="h2" size="lg" className="mt-3">
              {t('compareHeading')}
            </BrandedHeading>
            <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-ink md:text-lg">
              {t('compareLede')}
            </p>
          </div>

          {/* 2-column matrix: Category | Others | FutureLine. The FL column
              keeps the academy hairline + glow as the visual anchor. */}
          <div className="overflow-hidden rounded-md border border-hairline bg-canvas-card">
            <div className="sticky top-0 z-10 grid grid-cols-12 gap-3 border-b border-hairline bg-canvas-card px-5 py-5 backdrop-blur-md md:px-8 md:py-6">
              <div className="col-span-12 md:col-span-4">
                <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-ink-muted">{t('categoryLabel')}</p>
              </div>
              <div className="col-span-6 md:col-span-4">
                <p className="flex items-center gap-2 text-sm font-semibold tracking-tight text-ink md:text-base">
                  <span aria-hidden className="inline-block h-1.5 w-1.5 rounded-full bg-canvas-card" />
                  {t('compareOthers')}
                </p>
              </div>
              <div className="col-span-6 md:col-span-4">
                <p
                  className="flex items-center gap-2 text-sm font-semibold tracking-tight text-navy md:text-base"
                  style={{ textShadow: '0 0 8px rgba(91,123,251,0.4)' }}
                >
                  <span
                    aria-hidden
                    className="inline-block h-2 w-2 rounded-full bg-academy"
                    style={{ boxShadow: '0 0 8px rgba(91, 123, 251, 0.65)' }}
                  />
                  FutureLine
                </p>
              </div>
            </div>
            {vsRows.map((row, i) => (
              <FadeUp key={i} delay={i * 0.05}>
                <div className="grid grid-cols-12 items-start gap-3 border-b border-hairline px-5 py-6 last:border-b-0 md:gap-4 md:px-8 md:py-7">
                  <div className="col-span-12 md:col-span-4">
                    <div className="flex items-baseline gap-3">
                      <span aria-hidden className="font-mono text-[11px] tracking-[0.25em] text-academy/70">
                        {String(i + 1).padStart(2, '0')}
                      </span>
                      <h4 className="text-base font-semibold tracking-tight text-navy md:text-lg">{row.label}</h4>
                    </div>
                  </div>
                  <div className="col-span-6 md:col-span-4">
                    <p className="text-sm leading-relaxed text-ink-muted md:text-base">{row.others}</p>
                  </div>
                  <div className="relative col-span-6 md:col-span-4">
                    <span
                      aria-hidden
                      className="absolute -left-3 top-1 hidden h-[calc(100%-0.5rem)] w-px bg-gradient-to-b from-academy/40 via-academy/15 to-transparent md:block"
                    />
                    <p className="text-sm font-medium leading-relaxed text-navy md:text-base">{row.fl}</p>
                  </div>
                </div>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* ── For teams — custom training band ── */}
      <section
        id="for-teams"
        className="scroll-mt-24 border-t border-hairline px-4 py-16 sm:px-6 md:py-20 lg:px-8"
      >
        <div className="mx-auto max-w-7xl">
          {/* Centered section header — same pattern as other sections. */}
          <div className="mx-auto mb-10 max-w-3xl text-center md:mb-12">
            <SectionEyebrow accent="academy">{t('teamsEyebrow')}</SectionEyebrow>
            <BrandedHeading as="h2" size="lg" className="mt-3">
              {t('teamsHeading')}
            </BrandedHeading>
            <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-ink-muted md:text-lg">
              {t('teamsLede')}
            </p>
          </div>
          <div className="mx-auto max-w-3xl">
            <ul>
              {teamsItems.map((item, i) => (
                <li
                  key={i}
                  className="flex items-baseline gap-4 border-t border-hairline py-5 text-base text-ink md:text-lg"
                >
                  <span aria-hidden className="font-mono text-xs tracking-[0.3em] text-academy">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ── Who teaches (instructor authority band) ─────────────────
          Per research, the single biggest credibility signal on a
          course landing page is "name + employer". We don't yet have
          rich bios for every instructor, so this band renders whatever
          data the schema has (first/last name + optional bio) and
          stays useful when bios are filled in later. Empty bios fall
          back to the generic "FL Practitioner" badge. */}
      {instructors.length > 0 && (
        <section
          id="instructors"
          className="scroll-mt-24 border-t border-hairline px-4 py-16 sm:px-6 md:py-20 lg:px-8"
        >
          <div className="mx-auto max-w-7xl">
            <div className="mx-auto mb-8 max-w-3xl text-center md:mb-12">
              <SectionEyebrow accent="academy">{t('instructorsEyebrow')}</SectionEyebrow>
              <BrandedHeading as="h2" size="lg" className="mt-3">
                {t('instructorsHeading')}
              </BrandedHeading>
              <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-ink md:text-lg">
                {t('instructorsLede')}
              </p>
            </div>
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
              {instructors.map((inst, i) => {
                const fullName = `${inst.firstName ?? ''} ${inst.lastName ?? ''}`.trim() || t('instructorFallbackName');
                const initials =
                  `${(inst.firstName ?? '')[0] ?? ''}${(inst.lastName ?? '')[0] ?? ''}`.toUpperCase() || '··';
                return (
                  <FadeUp key={inst.id} delay={i * 0.06}>
                    <div className="flex h-full flex-col rounded-md border border-hairline bg-canvas-card p-6 transition-colors hover:border-academy/40 hover:bg-canvas-card">
                      <div className="flex items-center gap-4">
                        {/* Profile photo (if admin uploaded one) or
                            initials monogram fallback. We use a plain
                            <img> rather than next/image so external
                            hosts work without next.config domain
                            allowlisting. The img is decorative-with-
                            attribution: alt=fullName for screen
                            readers, monogram aria-hidden. */}
                        {inst.image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={inst.image}
                            alt={fullName}
                            className="h-12 w-12 flex-shrink-0 rounded-full border border-academy/30 object-cover"
                          />
                        ) : (
                          <div
                            aria-hidden
                            className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full border border-academy/30 bg-academy/10 font-mono text-sm font-medium uppercase tracking-[0.1em] text-academy"
                          >
                            {initials}
                          </div>
                        )}
                        <div className="min-w-0">
                          <h3 className="truncate text-base font-semibold tracking-tight text-navy md:text-lg">
                            {fullName}
                          </h3>
                          <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-academy/80">
                            {t('instructorBadge')}
                          </p>
                        </div>
                      </div>
                      {inst.bio && (
                        <p className="mt-5 text-sm leading-relaxed text-ink-muted">{inst.bio}</p>
                      )}
                    </div>
                  </FadeUp>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ── FAQ ── */}
      <section
        id="faq"
        className="scroll-mt-24 border-t border-hairline px-4 py-16 sm:px-6 md:py-20 lg:px-8"
      >
        <div className="mx-auto max-w-3xl">
          <div className="mb-8 text-center md:mb-12">
            <SectionEyebrow accent="academy">{t('faqEyebrow')}</SectionEyebrow>
            <BrandedHeading as="h2" size="lg" className="mt-3">
              {t('faqHeading')}
            </BrandedHeading>
          </div>
          <div className="mt-10">
            {faqs.map((f, i) => (
              <details
                key={i}
                className="group border-t border-hairline"
              >
                <summary
                  className="flex cursor-pointer list-none items-start justify-between gap-6 py-6 text-left"
                  data-cursor="hover"
                >
                  <span className="text-base font-medium leading-snug text-navy md:text-lg">{f.q}</span>
                  <span
                    aria-hidden
                    className="mt-1 flex-shrink-0 font-mono text-xs text-ink-muted transition-colors group-hover:text-academy group-open:rotate-45"
                    style={{ transition: 'transform 220ms ease, color 220ms ease' }}
                  >
                    +
                  </span>
                </summary>
                <p className="pb-6 pr-8 text-sm leading-relaxed text-ink md:text-base">{f.a}</p>
              </details>
            ))}
            <div className="border-t border-hairline" />
          </div>
        </div>
      </section>

      {/* ── Enquiry ── */}
      <section
        id="enquiry"
        className="scroll-mt-24 border-t border-hairline px-4 py-20 sm:px-6 md:py-28 lg:px-8"
      >
        <div className="mx-auto max-w-2xl">
          <FadeUp>
            <div className="mb-12 text-center">
              <SectionEyebrow accent="academy">{t('enquiryEyebrow')}</SectionEyebrow>
              <BrandedHeading as="h2" size="lg" className="mt-3">
                {t('enquiryHeading')}
              </BrandedHeading>
              <p className="mx-auto mt-6 max-w-lg text-base leading-relaxed text-ink-muted">
                {t('enquiryLede')}
              </p>
            </div>
          </FadeUp>
          <CourseEnquiryForm />
        </div>
      </section>
    </main>
  );
}
