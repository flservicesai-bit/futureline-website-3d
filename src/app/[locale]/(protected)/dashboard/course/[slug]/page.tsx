import { requireAuth } from '@/lib/requireAuth';
import { prisma } from '@/lib/prisma';
import { notFound, redirect } from 'next/navigation';
import Header from '@/components/Header';
import LessonViewer from '@/components/LessonViewer';
import { ArrowLeft, Users } from 'lucide-react';
import { Link } from '@/i18n/routing';
import { getLocale } from 'next-intl/server';
import { backfillLessonProgress, syncProgress } from '@/lib/progress';

export const dynamic = 'force-dynamic';

export default async function CourseLearnPage({ params }: { params: Promise<{ slug: string }> }) {
  const session = await requireAuth();
  const { slug } = await params;

  const course = await prisma.course.findUnique({
    where: { slug },
    include: {
      lessons: { orderBy: { orderIndex: 'asc' } },
      instructor: { select: { firstName: true, lastName: true } },
    },
  });

  if (!course) return notFound();

  const enrollment = await prisma.enrollment.findUnique({
    where: { userId_courseId: { userId: session.user.id, courseId: course.id } },
  });

  if (!enrollment) redirect(`/${await getLocale()}/dashboard`);

  // Enrolments from before per-lesson tracking get their old percentage
  // turned into ticks once; from then on progress is derived from the rows.
  await backfillLessonProgress(
    enrollment.id,
    enrollment.progressPercentage,
    course.lessons.map((l) => l.id),
  );
  const doneRows = await prisma.lessonProgress.findMany({
    where: { enrollmentId: enrollment.id },
    select: { lessonId: true },
  });
  const { progressPercentage } = await syncProgress(enrollment.id, course.id);

  const moduleCount = new Set(course.lessons.map(l => l.moduleTitle)).size;
  const progress = Math.round(progressPercentage);

  return (
    <>
      <Header />
      <div className="min-h-screen bg-canvas">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-ink-muted hover:text-teal-400 text-xs font-bold uppercase tracking-widest mb-8 transition-colors"
          >
            <ArrowLeft size={14} /> Back to Dashboard
          </Link>

          {/* Course header */}
          <div className="mb-8">
            <h1 className="text-2xl md:text-3xl font-black text-navy mb-2 tracking-tight">{course.title}</h1>
            <div className="flex flex-wrap items-center gap-4 text-xs text-ink-muted mb-5 font-medium uppercase tracking-widest">
              {course.instructor && (
                <span className="flex items-center gap-1.5">
                  <Users size={12} /> {course.instructor.firstName} {course.instructor.lastName}
                </span>
              )}
              <span>{moduleCount} modules</span>
              <span>{course.lessons.length} lessons</span>
            </div>

            {/* Progress bar */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-1.5 bg-canvas-card rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-teal-500 to-blue-600 rounded-full transition-all duration-500"
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
              <span className="text-xs text-ink-muted font-bold tabular-nums shrink-0">{progress}%</span>
            </div>
          </div>

          <LessonViewer
            lessons={course.lessons.map(l => ({
              id: l.id,
              moduleTitle: l.moduleTitle,
              lessonTitle: l.lessonTitle,
              lessonType: l.lessonType,
              content: l.content,
              videoUrl: l.videoUrl,
              resources: l.resources,
              questions: l.questions as any,
              orderIndex: l.orderIndex,
            }))}
            enrollmentId={enrollment.id}
            completedLessonIds={doneRows.map((r) => r.lessonId)}
          />
        </div>
      </div>
    </>
  );
}
