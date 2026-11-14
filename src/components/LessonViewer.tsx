'use client';
import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/routing';
import { BookOpen, CheckCircle, Play, FileText, ChevronDown, ChevronRight, Download, StickyNote, HelpCircle, CircleDot } from 'lucide-react';

interface Question {
  question: string;
  options: string[];
  correctIndex: number;
}

interface Lesson {
  id: string;
  moduleTitle: string;
  lessonTitle: string;
  lessonType: string;
  content: string | null;
  /** The link itself stays on the server: the player URL is fetched when the lesson opens. */
  hasVideo: boolean;
  resources: string | null;
  questions: Question[] | null;
  orderIndex: number;
}

/**
 * A lesson's video. The player link is asked for when the lesson opens
 * (/api/lessons/:id/player checks the enrolment and signs Bunny links to
 * expire), so the page never carries links that could be copied and shared.
 * The learner's email drifts over the picture to make screen recordings traceable.
 */
function LessonVideo({ lessonId, title, watermark }: { lessonId: string; title: string; watermark: string | null }) {
  const t = useTranslations('lessonViewer');
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<{ status: 'loading' | 'unsupported' | 'error' } | { status: 'ready'; url: string }>({
    status: 'loading',
  });

  useEffect(() => {
    let alive = true;
    setState({ status: 'loading' });
    fetch(`/api/lessons/${lessonId}/player`, { cache: 'no-store' })
      .then(async (res) => {
        if (res.status === 422) return { status: 'unsupported' as const };
        if (!res.ok) throw new Error(`Player link failed: ${res.status}`);
        const data: { url?: string } = await res.json();
        return data.url ? { status: 'ready' as const, url: data.url } : { status: 'error' as const };
      })
      .catch(() => ({ status: 'error' as const }))
      .then((next) => {
        if (alive) setState(next);
      });
    return () => {
      alive = false;
    };
  }, [lessonId, attempt]);

  if (state.status === 'unsupported') {
    return (
      <div className="mb-6 bg-canvas-card border border-hairline rounded-xl p-5 flex items-center gap-3 text-ink-muted">
        <Play size={18} />
        <span className="text-sm">{t('videoAvailable')}</span>
      </div>
    );
  }

  return (
    <div className="mb-6 rounded-xl overflow-hidden bg-black border border-hairline">
      <div className="relative w-full" style={{ paddingTop: '56.25%' }}>
        {state.status === 'ready' && (
          <iframe
            src={state.url}
            className="absolute inset-0 w-full h-full"
            allow="accelerometer; gyroscope; autoplay; clipboard-write; encrypted-media; picture-in-picture"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
            title={title}
          />
        )}
        {state.status === 'loading' && (
          <div className="absolute inset-0 flex items-center justify-center text-sm text-white/60">{t('videoLoading')}</div>
        )}
        {state.status === 'error' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center text-sm text-white/70">
            <span>{t('videoError')}</span>
            <button
              onClick={() => setAttempt((n) => n + 1)}
              className="px-4 py-1.5 rounded-lg border border-white/20 text-xs font-bold uppercase tracking-widest hover:bg-white/10"
            >
              {t('tryAgain')}
            </button>
          </div>
        )}
        {state.status === 'ready' && watermark && (
          <span aria-hidden="true" className="lesson-watermark">
            {watermark}
          </span>
        )}
      </div>
    </div>
  );
}

function parseResources(resources: string): { name: string; url: string }[] {
  return resources.split('\n').filter(Boolean).map(line => {
    const parts = line.split('|');
    if (parts.length === 2) return { name: parts[0].trim(), url: parts[1].trim() };
    try {
      new URL(line.trim());
      const filename = line.trim().split('/').pop() || 'Download';
      return { name: filename, url: line.trim() };
    } catch {
      return { name: line.trim(), url: '' };
    }
  });
}

/**
 * Questions a learner can actually pass: a prompt, at least two options and
 * a correct option that isn't blank. A quiz saved with none of these used to
 * render nothing and had no Mark Complete button, so the course could never
 * be finished.
 */
function playableQuestions(questions: Question[] | null): Question[] {
  if (!Array.isArray(questions)) return [];
  return questions.filter(
    (q) =>
      q?.question?.trim() &&
      Array.isArray(q.options) &&
      q.options.filter((o) => o?.trim()).length >= 2 &&
      q.options[q.correctIndex]?.trim(),
  );
}

function QuizView({ questions, onComplete }: { questions: Question[]; onComplete: () => void }) {
  const t = useTranslations('lessonViewer');
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [submitted, setSubmitted] = useState(false);

  const score = questions.reduce((acc, q, i) => acc + (answers[i] === q.correctIndex ? 1 : 0), 0);
  const allAnswered = Object.keys(answers).length === questions.length;

  const handleSubmit = () => {
    setSubmitted(true);
    if (score === questions.length) onComplete();
  };

  return (
    <div className="space-y-4">
      {questions.map((q, qi) => (
        <div key={qi} className="rounded-xl border border-hairline bg-canvas-alt p-5">
          <p className="font-semibold text-navy text-sm mb-3">
            {qi + 1}. {q.question}
          </p>
          <div className="space-y-2">
            {q.options.map((opt, oi) => {
              if (!opt.trim()) return null;
              const isSelected = answers[qi] === oi;
              const isCorrect = q.correctIndex === oi;
              let optionStyle = 'border-hairline bg-canvas-card hover:border-teal-500/40 text-ink-muted';
              if (submitted) {
                if (isCorrect) optionStyle = 'border-green-500/40 bg-green-500/10 text-green-300';
                else if (isSelected && !isCorrect) optionStyle = 'border-red-500/40 bg-red-500/10 text-red-300';
                else optionStyle = 'border-hairline bg-canvas-card text-ink-muted';
              } else if (isSelected) {
                optionStyle = 'border-teal-500/50 bg-teal-500/10 text-navy';
              }

              return (
                <button
                  key={oi}
                  onClick={() => !submitted && setAnswers(prev => ({ ...prev, [qi]: oi }))}
                  disabled={submitted}
                  className={`w-full text-left p-3 rounded-lg border text-sm transition-all flex items-center gap-3 ${optionStyle}`}
                >
                  <CircleDot size={15} className={isSelected ? 'text-teal-400 flex-shrink-0' : 'text-ink-muted flex-shrink-0'} />
                  {opt}
                </button>
              );
            })}
          </div>
        </div>
      ))}

      {!submitted ? (
        <button
          onClick={handleSubmit}
          disabled={!allAnswered}
          className="px-6 py-2.5 rounded-lg bg-gradient-to-r from-teal-500 to-blue-600 text-navy text-sm font-bold hover:opacity-90 transition-opacity disabled:opacity-40 uppercase tracking-widest"
        >
          {t('submitAnswers')}
        </button>
      ) : (
        <div className={`rounded-xl p-5 border text-sm font-semibold ${
          score === questions.length
            ? 'bg-green-500/10 border-green-500/20 text-green-400'
            : 'bg-amber-500/10 border-amber-500/20 text-amber-400'
        }`}>
          {t('score', { score, total: questions.length })}
          {score === questions.length ? t('perfectSuffix') : ''}
          {score < questions.length && (
            <button
              onClick={() => { setSubmitted(false); setAnswers({}); }}
              className="block mt-2 text-xs font-bold underline underline-offset-2 opacity-80 hover:opacity-100"
            >
              {t('tryAgain')}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default function LessonViewer({
  lessons,
  enrollmentId,
  completedLessonIds,
  viewerEmail,
}: {
  lessons: Lesson[];
  enrollmentId: string;
  /** Lessons this learner has completed, from the server. */
  completedLessonIds: string[];
  /** Shown over lesson videos as a watermark. */
  viewerEmail: string | null;
}) {
  const t = useTranslations('lessonViewer');
  const router = useRouter();
  const [completed, setCompleted] = useState<Set<string>>(new Set(completedLessonIds));
  const [activeLesson, setActiveLesson] = useState<string | null>(null);
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());

  const modules = lessons.reduce((acc: Record<string, Lesson[]>, lesson) => {
    if (!acc[lesson.moduleTitle]) acc[lesson.moduleTitle] = [];
    acc[lesson.moduleTitle].push(lesson);
    return acc;
  }, {});

  const toggleModule = (moduleName: string) => {
    setExpandedModules(prev => {
      const next = new Set(prev);
      if (next.has(moduleName)) next.delete(moduleName);
      else next.add(moduleName);
      return next;
    });
  };

  const selectLesson = (lessonId: string, moduleName: string) => {
    setActiveLesson(activeLesson === lessonId ? null : lessonId);
    if (!expandedModules.has(moduleName)) {
      setExpandedModules(prev => new Set(prev).add(moduleName));
    }
  };

  const markComplete = async (lessonId: string) => {
    if (completed.has(lessonId)) return;
    setCompleted((prev) => new Set(prev).add(lessonId));
    try {
      const res = await fetch('/api/enrollment/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enrollmentId, lessonId }),
      });
      if (!res.ok) throw new Error(`Progress not saved: ${res.status}`);
      // The progress bar above is rendered on the server.
      router.refresh();
    } catch {
      // Not saved: untick so the learner can try again.
      setCompleted((prev) => {
        const next = new Set(prev);
        next.delete(lessonId);
        return next;
      });
    }
  };

  const moduleNames = Object.keys(modules);

  return (
    <div className="space-y-3">
      {moduleNames.map((moduleName, moduleIndex) => {
        const moduleLessons = modules[moduleName];
        const isExpanded = expandedModules.has(moduleName);
        const completedInModule = moduleLessons.filter(l => completed.has(l.id)).length;
        const allDone = completedInModule === moduleLessons.length && moduleLessons.length > 0;

        return (
          <div key={moduleName} className="rounded-xl border border-hairline bg-canvas-card backdrop-blur-sm overflow-hidden">
            {/* Module header */}
            <button
              onClick={() => toggleModule(moduleName)}
              className="w-full flex items-center justify-between px-5 py-4 bg-canvas-card hover:bg-canvas-card transition-colors text-left"
            >
              <div className="flex items-center gap-3">
                {isExpanded
                  ? <ChevronDown className="text-teal-400 flex-shrink-0" size={18} />
                  : <ChevronRight className="text-ink-muted flex-shrink-0" size={18} />
                }
                <div>
                  <h3 className="font-bold text-navy text-sm">
                    {t('moduleLabel', { number: moduleIndex + 1, name: moduleName })}
                  </h3>
                  <span className="text-[11px] text-ink-muted">
                    {t('moduleLessons', { count: moduleLessons.length, done: completedInModule, total: moduleLessons.length })}
                  </span>
                </div>
              </div>
              {allDone && <CheckCircle className="text-teal-400 flex-shrink-0" size={18} />}
            </button>

            {/* Lessons */}
            {isExpanded && (
              <div className="divide-y divide-hairline">
                {moduleLessons.map((lesson) => {
                  const isActive = activeLesson === lesson.id;
                  const isQuiz = lesson.lessonType === 'QUIZ';
                  const quizQuestions = isQuiz ? playableQuestions(lesson.questions) : [];
                  // A quiz with no usable question is completed like a normal lesson.
                  const hasQuiz = quizQuestions.length > 0;

                  return (
                    <div key={lesson.id}>
                      <button
                        onClick={() => selectLesson(lesson.id, moduleName)}
                        className={`w-full text-left px-5 py-3 flex items-center gap-3 transition-all border-l-2 ${
                          isActive
                            ? 'bg-teal-500/[0.06] border-l-teal-400'
                            : 'hover:bg-canvas-card border-l-transparent'
                        }`}
                      >
                        {completed.has(lesson.id) ? (
                          <CheckCircle className="text-teal-400 flex-shrink-0" size={15} />
                        ) : isQuiz ? (
                          <HelpCircle className="text-amber-400 flex-shrink-0" size={15} />
                        ) : (
                          <Play className="text-ink-muted flex-shrink-0" size={15} />
                        )}
                        <span className={`text-sm flex-1 ${isActive ? 'text-teal-300 font-semibold' : 'text-ink-muted'}`}>
                          {lesson.lessonTitle}
                        </span>
                        {isQuiz && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-400 uppercase tracking-widest">
                            {t('quiz')}
                          </span>
                        )}
                      </button>

                      {/* Expanded lesson content */}
                      {isActive && (
                        <div className="px-5 py-6 bg-canvas-alt border-t border-hairline">

                          {/* Video */}
                          {!isQuiz && lesson.hasVideo && (
                            <LessonVideo lessonId={lesson.id} title={lesson.lessonTitle} watermark={viewerEmail} />
                          )}

                          {/* Notes / instructions */}
                          {lesson.content && (
                            <div className="mb-6">
                              <div className="flex items-center gap-2 mb-3">
                                <StickyNote className="text-[#1466de]" size={16} />
                                <h4 className="font-bold text-navy text-xs uppercase tracking-widest">
                                  {isQuiz ? t('instructions') : t('lessonNotes')}
                                </h4>
                              </div>
                              <div className="rounded-xl border border-blue-500/10 bg-blue-500/[0.04] p-5">
                                <p className="text-ink-muted leading-relaxed whitespace-pre-line text-sm">{lesson.content}</p>
                              </div>
                            </div>
                          )}

                          {/* Quiz */}
                          {hasQuiz && (
                            <div className="mb-6">
                              <QuizView
                                questions={quizQuestions}
                                onComplete={() => markComplete(lesson.id)}
                              />
                            </div>
                          )}

                          {/* Resources */}
                          {!isQuiz && lesson.resources && (
                            <div className="mb-6">
                              <div className="flex items-center gap-2 mb-3">
                                <Download className="text-[#1466de]" size={16} />
                                <h4 className="font-bold text-navy text-xs uppercase tracking-widest">{t('attachments')}</h4>
                              </div>
                              <div className="space-y-2">
                                {parseResources(lesson.resources).map((resource, i) => (
                                  <div key={i} className="flex items-center gap-3 bg-canvas-card border border-hairline rounded-lg p-3">
                                    <FileText className="text-ink-muted flex-shrink-0" size={15} />
                                    {resource.url ? (
                                      <a
                                        href={resource.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-sm text-teal-400 hover:text-teal-300 transition-colors font-medium"
                                        download
                                      >
                                        {resource.name}
                                      </a>
                                    ) : (
                                      <span className="text-sm text-ink-muted">{resource.name}</span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Mark complete / completed state */}
                          {!hasQuiz && (
                            <div className="flex items-center justify-between pt-4 border-t border-hairline">
                              {completed.has(lesson.id) ? (
                                <span className="flex items-center gap-2 text-teal-400 font-bold text-sm">
                                  <CheckCircle size={15} /> {t('completed')}
                                </span>
                              ) : (
                                <button
                                  onClick={() => markComplete(lesson.id)}
                                  className="px-5 py-2 rounded-lg bg-gradient-to-r from-teal-500 to-blue-600 text-navy text-sm font-bold hover:opacity-90 transition-opacity uppercase tracking-widest"
                                >
                                  {t('markComplete')}
                                </button>
                              )}
                            </div>
                          )}

                          {hasQuiz && completed.has(lesson.id) && (
                            <div className="flex items-center gap-2 text-teal-400 font-bold text-sm pt-4 border-t border-hairline">
                              <CheckCircle size={15} /> {t('completed')}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      {moduleNames.length === 0 && (
        <div className="rounded-xl border border-hairline bg-canvas-card p-12 text-center">
          <BookOpen className="text-slate-700 mx-auto mb-4" size={48} />
          <p className="text-ink-muted text-sm">{t('noLessons')}</p>
        </div>
      )}
    </div>
  );
}
