'use client';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { formatCoursePrice } from '@/lib/utils';
import { BookOpen, Clock, Loader2 } from 'lucide-react';

interface RecommendedCourse {
  id: string;
  title: string;
  slug: string;
  shortDescription: string;
  deliveryType: string;
  level: string;
  price: number;
  discountPrice: number | null;
  durationHours: number;
  category: string;
  matchScore: number;
}

export default function AIRecommendationForm() {
  const t = useTranslations('aiRecommend');
  const [goal, setGoal] = useState('');
  const [skillLevel, setSkillLevel] = useState('');
  const [deliveryPref, setDeliveryPref] = useState('');
  const [budget, setBudget] = useState('');
  const [results, setResults] = useState<RecommendedCourse[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/ai/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          goal,
          skillLevel,
          deliveryPref,
          budget: budget ? Number(budget) : undefined,
        }),
      });
      const data = await res.json();
      setResults(data.recommendations || []);
      setSearched(true);
    } catch {
      alert(t('failed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <form onSubmit={handleSubmit} className="mx-auto grid max-w-2xl grid-cols-1 gap-5 md:grid-cols-2">
        <div className="md:col-span-2">
          <label className="fl-label" htmlFor="ai-goal">{t('goalLabel')}</label>
          <input
            id="ai-goal"
            type="text"
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            placeholder={t('goalPlaceholder')}
            className="fl-input"
            required
          />
        </div>
        <div>
          <label className="fl-label" htmlFor="ai-skill">{t('skillLabel')}</label>
          <select
            id="ai-skill"
            value={skillLevel}
            onChange={(e) => setSkillLevel(e.target.value)}
            className="fl-select"
            required
          >
            <option value="">{t('selectLevel')}</option>
            <option value="Beginner">{t('beginner')}</option>
            <option value="Intermediate">{t('intermediate')}</option>
            <option value="Advanced">{t('advanced')}</option>
          </select>
        </div>
        <div>
          <label className="fl-label" htmlFor="ai-delivery">{t('deliveryLabel')}</label>
          <select
            id="ai-delivery"
            value={deliveryPref}
            onChange={(e) => setDeliveryPref(e.target.value)}
            className="fl-select"
          >
            <option value="">{t('noPreference')}</option>
            <option value="ONLINE">{t('online')}</option>
            <option value="IN_PERSON">{t('inPerson')}</option>
            <option value="HYBRID">{t('hybrid')}</option>
          </select>
        </div>
        <div>
          <label className="fl-label" htmlFor="ai-budget">{t('budgetLabel')}</label>
          <input
            id="ai-budget"
            type="number"
            value={budget}
            onChange={(e) => setBudget(e.target.value)}
            placeholder={t('budgetPlaceholder')}
            className="fl-input"
          />
        </div>
        <div className="flex items-end md:col-span-2">
          <button
            type="submit"
            disabled={loading}
            className="fl-submit"
            data-cursor="magnetic"
            data-cursor-strength="22"
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin" size={16} /> {t('analysing')}
              </>
            ) : (
              t('getRecommendations')
            )}
          </button>
        </div>
      </form>

      {searched && (
        <div className="mt-14">
          {results.length === 0 ? (
            <p className="text-center text-sm text-ink-muted">
              {t('noResults')}
            </p>
          ) : (
            <>
              <div className="mb-10 flex items-center justify-center gap-3">
                <div className="h-px w-10 bg-academy" />
                <h3 className="font-mono text-[11px] uppercase tracking-[0.3em] text-ink">
                  {t('recommendedForYou')}
                </h3>
                <div className="h-px w-10 bg-academy" />
              </div>
              <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
                {results.map((course) => (
                  <Link
                    href={`/courses/${course.slug}`}
                    key={course.id}
                    data-cursor="hover"
                    className="group flex flex-col overflow-hidden rounded-md border border-hairline bg-canvas-card backdrop-blur-sm transition-all duration-300 hover:border-academy/40 hover:bg-canvas-card"
                  >
                    <div className="relative flex h-28 items-center justify-center border-b border-hairline bg-gradient-to-br from-academy/10 via-black to-black">
                      <BookOpen className="text-ink-muted" size={28} />
                    </div>
                    <div className="flex flex-1 flex-col p-5">
                      <div className="mb-3 flex items-center gap-2">
                        <span className="rounded border border-academy/30 bg-academy/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.2em] text-academy">
                          {course.deliveryType.replace('_', ' ')}
                        </span>
                        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted">
                          {course.level}
                        </span>
                      </div>
                      <h4 className="mb-2 text-sm font-semibold leading-snug text-navy transition-colors group-hover:text-academy-light">
                        {course.title}
                      </h4>
                      <p className="mb-4 line-clamp-2 flex-1 text-xs leading-relaxed text-ink-muted">
                        {course.shortDescription}
                      </p>
                      <div className="flex items-center justify-between border-t border-hairline pt-3">
                        <span className="text-sm font-semibold text-navy">
                          {course.price > 0 ? formatCoursePrice(course.discountPrice ?? course.price) : t('free')}
                        </span>
                        <span className="flex items-center gap-1 text-xs text-ink-muted">
                          <Clock size={11} /> {course.durationHours}{t('hoursSuffix')}
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
