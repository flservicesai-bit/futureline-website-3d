import { Link } from '@/i18n/routing';
import { getLocale, getTranslations } from 'next-intl/server';
import { prisma } from '@/lib/prisma';
import { Search } from 'lucide-react';
import CourseEnquiryForm from '@/components/CourseEnquiryForm';
import { FadeUp } from '@/components/motion/FadeUp';
import { metadataFor } from '@/lib/seo';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { SectionEyebrow } from '@/components/ui/SectionEyebrow';
import { CourseCard, courseCardSelect } from '@/components/courses/CourseCard';
import { AutoSubmitSelect } from '@/components/courses/AutoSubmitSelect';

export const dynamic = 'force-dynamic';

// The Course.deliveryType enum; any other ?type= value is ignored.
const DELIVERY_TYPES = ['ONLINE', 'IN_PERSON', 'HYBRID'] as const;
const LEVELS = ['Beginner', 'Intermediate', 'Advanced'] as const;

export const generateMetadata = metadataFor('courses', '/courses');

const SECTION_HEADING = 'mt-3 text-3xl font-semibold tracking-tight text-navy md:text-4xl';
const FIELD_LABEL = 'mb-1.5 block text-xs font-medium text-ink-muted';

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
  const activeTab = params.tab === 'enrolled' && session?.user?.id ? 'enrolled' : 'all';

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

  // Instructors are queried independently so the "Who teaches" band can
  // render every practitioner, not only those with a course in this list.
  const [courses, categoryRows, instructors] = await Promise.all([
    prisma.course.findMany({
      where,
      select: {
        ...courseCardSelect,
        id: true,
        enrollments: session?.user?.id
          ? { where: { userId: session.user.id }, select: { id: true } }
          : false,
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.course.findMany({
      where: baseFilter,
      select: { category: true },
      distinct: ['category'],
      orderBy: { category: 'asc' },
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
  const filtered = !!(params.search || params.level || params.category || params.type);
  // Clearing filters keeps the "My courses" view.
  const clearHref = activeTab === 'enrolled' ? '/courses?tab=enrolled' : '/courses';
  const count = (n: number) => ({ count: n, n: String(n) });

  return (
    <main className="bg-canvas">
      {/* ── Catalogue: a compact header, the filter bar, then the cards ── */}
      <section id="catalog" className="scroll-mt-24 px-4 pt-10 pb-16 sm:px-6 md:pt-14 md:pb-24 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <header className="max-w-3xl">
            <SectionEyebrow accent="academy">{t('eyebrow')}</SectionEyebrow>
            <h1 className="mt-4 text-4xl font-semibold leading-[1.1] tracking-tight text-navy md:text-5xl">
              {t.rich('heading', {
                accent: (chunks) => <span className="text-teal-ink">{chunks}</span>,
              })}
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-ink-muted md:text-lg">{t('subhead')}</p>
          </header>

          {/* Filters: a plain GET form, so they work without JavaScript and
              every filtered view has its own URL. The selects submit on
              change. The action is locale-prefixed: a bare /courses
              redirects to the default locale, which sent Arabic searches
              to /en. The key remounts the form when the filters change: the
              fields are uncontrolled, so after "Clear filters" (a client-side
              navigation) they would otherwise keep the old values and send
              them with the next search. */}
          <form
            key={[activeTab, params.search, params.level, params.category, params.type].join('|')}
            method="GET"
            action={`/${locale}/courses`}
            role="search"
            aria-label={t('filtersLabel')}
            className="mt-8 grid grid-cols-2 gap-3 rounded-xl border border-hairline bg-canvas-card p-4 shadow-[0_1px_2px_rgba(1,28,65,0.04)] md:mt-10 lg:grid-cols-[minmax(0,1fr)_repeat(3,minmax(0,12rem))_auto] lg:items-end"
          >
            <div className="col-span-2 lg:col-span-1">
              <label htmlFor="course-search" className={FIELD_LABEL}>
                {t('searchLabel')}
              </label>
              <div className="relative">
                <Search
                  aria-hidden
                  className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-ink-muted"
                  size={16}
                />
                <input
                  id="course-search"
                  type="search"
                  name="search"
                  defaultValue={params.search}
                  placeholder={t('searchPlaceholder')}
                  className="fl-input !py-2.5 !ps-9"
                />
              </div>
            </div>
            <div>
              <label htmlFor="course-level" className={FIELD_LABEL}>
                {t('levelLabel')}
              </label>
              <AutoSubmitSelect id="course-level" name="level" defaultValue={params.level ?? ''} className="fl-input !py-2.5">
                <option value="">{t('allLevels')}</option>
                {LEVELS.map((level) => (
                  <option key={level} value={level}>
                    {t(`level${level}`)}
                  </option>
                ))}
              </AutoSubmitSelect>
            </div>
            <div>
              <label htmlFor="course-category" className={FIELD_LABEL}>
                {t('categoryLabel')}
              </label>
              <AutoSubmitSelect
                id="course-category"
                name="category"
                defaultValue={params.category ?? ''}
                className="fl-input !py-2.5"
              >
                <option value="">{t('allCategories')}</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </AutoSubmitSelect>
            </div>
            <div>
              <label htmlFor="course-delivery" className={FIELD_LABEL}>
                {t('deliveryLabel')}
              </label>
              <AutoSubmitSelect id="course-delivery" name="type" defaultValue={params.type ?? ''} className="fl-input !py-2.5">
                <option value="">{t('allDelivery')}</option>
                <option value="ONLINE">{t('deliveryOnline')}</option>
                <option value="IN_PERSON">{t('deliveryInPerson')}</option>
                <option value="HYBRID">{t('deliveryHybrid')}</option>
              </AutoSubmitSelect>
            </div>
            <div className="flex items-end">
              {activeTab === 'enrolled' && <input type="hidden" name="tab" value="enrolled" />}
              <button
                type="submit"
                className="w-full rounded-md bg-navy px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-teal-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal"
              >
                {t('searchButton')}
              </button>
            </div>
          </form>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-ink-muted" aria-live="polite">
              <span className="font-semibold text-navy">{t('resultsCount', count(courses.length))}</span>
              {filtered && (
                <>
                  <span aria-hidden className="mx-2">·</span>
                  <Link href={clearHref} className="font-medium text-teal-ink underline-offset-4 hover:underline">
                    {t('clearFilters')}
                  </Link>
                </>
              )}
            </p>
            {session?.user?.id && (
              <nav aria-label={t('viewLabel')} className="inline-flex rounded-lg border border-hairline bg-canvas-card p-1 text-sm">
                {[
                  { key: 'all', label: t('viewAll'), href: '/courses' },
                  { key: 'enrolled', label: t('viewEnrolled'), href: '/courses?tab=enrolled' },
                ].map(({ key, label, href }) => (
                  <Link
                    key={key}
                    href={href}
                    aria-current={activeTab === key ? 'page' : undefined}
                    className={`rounded-md px-3 py-1.5 font-medium transition-colors ${
                      activeTab === key ? 'bg-navy text-white' : 'text-ink-muted hover:text-navy'
                    }`}
                  >
                    {label}
                  </Link>
                ))}
              </nav>
            )}
          </div>

          {courses.length === 0 ? (
            <div className="mt-6 rounded-xl border border-dashed border-hairline bg-canvas-card px-6 py-16 text-center">
              <p className="text-lg font-semibold text-navy">{t('emptyTitle')}</p>
              <p className="mt-2 text-sm text-ink-muted">{t('emptyBody')}</p>
              {filtered && (
                <Link
                  href={clearHref}
                  className="mt-6 inline-block rounded-md border border-hairline px-4 py-2 text-sm font-medium text-navy transition-colors hover:border-teal/40 hover:text-teal-ink"
                >
                  {t('clearFilters')}
                </Link>
              )}
            </div>
          ) : (
            <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {courses.map((course) => (
                <CourseCard
                  key={course.id}
                  course={course}
                  locale={locale}
                  enrolled={!!course.enrollments?.length}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── For teams — custom training band ── */}
      <section
        id="for-teams"
        className="scroll-mt-24 border-t border-hairline bg-canvas-card px-4 py-16 sm:px-6 md:py-24 lg:px-8"
      >
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16">
          <div>
            <SectionEyebrow accent="academy">{t('teamsEyebrow')}</SectionEyebrow>
            <h2 className={SECTION_HEADING}>{t('teamsHeading')}</h2>
            <p className="mt-5 text-base leading-relaxed text-ink-muted md:text-lg">{t('teamsLede')}</p>
            <a
              href="#enquiry"
              className="mt-8 inline-block rounded-md bg-navy px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-teal-ink"
            >
              {t('teamsCta')}
            </a>
          </div>
          <ul className="divide-y divide-hairline border-y border-hairline">
            {teamsItems.map((item, i) => (
              <li key={i} className="flex items-baseline gap-5 py-5 text-base text-ink md:text-lg">
                <span aria-hidden className="w-6 flex-shrink-0 text-sm font-semibold text-teal-ink">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── Who teaches ──
          Renders whatever the schema has (name, optional photo and bio) and
          stays useful when bios are filled in later. */}
      {instructors.length > 0 && (
        <section
          id="instructors"
          className="scroll-mt-24 border-t border-hairline px-4 py-16 sm:px-6 md:py-24 lg:px-8"
        >
          <div className="mx-auto max-w-7xl">
            <div className="max-w-3xl">
              <SectionEyebrow accent="academy">{t('instructorsEyebrow')}</SectionEyebrow>
              <h2 className={SECTION_HEADING}>{t('instructorsHeading')}</h2>
              <p className="mt-5 text-base leading-relaxed text-ink-muted md:text-lg">{t('instructorsLede')}</p>
            </div>
            <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {instructors.map((inst, i) => {
                const fullName = `${inst.firstName ?? ''} ${inst.lastName ?? ''}`.trim() || t('instructorFallbackName');
                const initials =
                  `${(inst.firstName ?? '')[0] ?? ''}${(inst.lastName ?? '')[0] ?? ''}`.toUpperCase() || '··';
                return (
                  <FadeUp key={inst.id} delay={i * 0.06}>
                    <div className="flex h-full flex-col rounded-xl border border-hairline bg-canvas-card p-6">
                      <div className="flex items-center gap-4">
                        {/* A plain <img> so photos from any host work without
                            next.config allowlisting. */}
                        {inst.image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={inst.image}
                            alt={fullName}
                            className="h-14 w-14 flex-shrink-0 rounded-full object-cover"
                          />
                        ) : (
                          <div
                            aria-hidden
                            className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full bg-teal/10 text-base font-semibold text-teal-ink"
                          >
                            {initials}
                          </div>
                        )}
                        <div className="min-w-0">
                          <h3 className="truncate text-lg font-semibold tracking-tight text-navy">{fullName}</h3>
                          <p className="text-sm text-ink-muted">{t('instructorBadge')}</p>
                        </div>
                      </div>
                      {inst.bio && <p className="mt-5 text-sm leading-relaxed text-ink-muted">{inst.bio}</p>}
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
        className="scroll-mt-24 border-t border-hairline bg-canvas-card px-4 py-16 sm:px-6 md:py-24 lg:px-8"
      >
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[minmax(0,4fr)_minmax(0,8fr)] lg:gap-16">
          <div>
            <SectionEyebrow accent="academy">{t('faqEyebrow')}</SectionEyebrow>
            <h2 className={SECTION_HEADING}>{t('faqHeading')}</h2>
          </div>
          <div className="border-b border-hairline">
            {faqs.map((f, i) => (
              <details key={i} className="group border-t border-hairline">
                <summary
                  className="flex cursor-pointer list-none items-start justify-between gap-6 py-5 text-start"
                  data-cursor="hover"
                >
                  <span className="text-base font-medium leading-snug text-navy md:text-lg">{f.q}</span>
                  <span
                    aria-hidden
                    className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border border-hairline text-sm text-ink-muted transition-transform duration-200 group-open:rotate-45 group-hover:text-teal-ink"
                  >
                    +
                  </span>
                </summary>
                <p className="pb-6 pe-10 text-sm leading-relaxed text-ink md:text-base">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ── Enquiry ── */}
      <section
        id="enquiry"
        className="scroll-mt-24 border-t border-hairline px-4 py-16 sm:px-6 md:py-24 lg:px-8"
      >
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16">
          <div>
            <SectionEyebrow accent="academy">{t('enquiryEyebrow')}</SectionEyebrow>
            <h2 className={SECTION_HEADING}>{t('enquiryHeading')}</h2>
            <p className="mt-5 text-base leading-relaxed text-ink-muted md:text-lg">{t('enquiryLede')}</p>
          </div>
          <div className="rounded-xl border border-hairline bg-canvas-card p-6 md:p-8">
            <CourseEnquiryForm />
          </div>
        </div>
      </section>
    </main>
  );
}
