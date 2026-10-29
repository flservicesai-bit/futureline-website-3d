import { prisma } from './prisma';

/**
 * Recomputes an enrolment's progress from its LessonProgress rows and saves
 * it when it changed. The stored percentage can drift when lessons are added
 * to or removed from a course, so it is always derived, never trusted.
 */
export async function syncProgress(enrollmentId: string, courseId: string) {
  const [total, done] = await Promise.all([
    prisma.lesson.count({ where: { courseId } }),
    prisma.lessonProgress.count({ where: { enrollmentId, lesson: { courseId } } }),
  ]);
  const progressPercentage = total > 0 ? Math.min(100, (done / total) * 100) : 0;
  const completed = total > 0 && done >= total;

  const current = await prisma.enrollment.findUnique({
    where: { id: enrollmentId },
    select: { progressPercentage: true, completed: true },
  });
  if (current && (current.progressPercentage !== progressPercentage || current.completed !== completed)) {
    await prisma.enrollment.update({
      where: { id: enrollmentId },
      data: { progressPercentage, completed },
    });
  }
  return { progressPercentage, completed };
}

/**
 * One-time migration for enrolments from before per-lesson tracking, when
 * only a percentage was stored. Marks the first N lessons as done: the same
 * lessons the old viewer showed ticked (with its rounding error fixed).
 */
export async function backfillLessonProgress(
  enrollmentId: string,
  progressPercentage: number,
  lessonIdsInOrder: string[],
) {
  if (progressPercentage <= 0 || lessonIdsInOrder.length === 0) return;
  const existing = await prisma.lessonProgress.count({ where: { enrollmentId } });
  if (existing > 0) return;
  const n = Math.min(
    lessonIdsInOrder.length,
    Math.round((progressPercentage / 100) * lessonIdsInOrder.length),
  );
  if (n === 0) return;
  await prisma.lessonProgress.createMany({
    data: lessonIdsInOrder.slice(0, n).map((lessonId) => ({ enrollmentId, lessonId })),
    skipDuplicates: true,
  });
}
