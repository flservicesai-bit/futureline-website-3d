/**
 * DifferentiatorStrip — "What makes us different", from the company profile.
 *
 * Deliberately text rather than invented statistics: the profile makes
 * qualitative claims ("we build and we teach", "days, not months"), and
 * manufacturing percentages to fill a metrics row would be fabricating proof.
 */
import { getTranslations } from 'next-intl/server';
import { Stagger } from '@/components/motion/Stagger';

// Was 4 cards (buildTeach, speed, bilingual, onPremise) — 'bilingual' was
// dropped along with Arabic/RTL support rather than replaced with a new
// claim, so the grid drops to 3 columns to match.
const KEYS = ['buildTeach', 'speed', 'onPremise'] as const;

export async function DifferentiatorStrip() {
  const t = await getTranslations('differentiators');

  return (
    <section aria-labelledby="differentiators-heading" className="relative py-20 md:py-28">
      <div className="mx-auto max-w-6xl px-6">
        <h2
          id="differentiators-heading"
          className="mb-12 text-center font-display text-sm font-semibold uppercase tracking-[0.3em] text-teal-ink"
        >
          {t('heading')}
        </h2>

        <Stagger className="grid gap-6 sm:grid-cols-3">
          {KEYS.map((key) => (
            <div
              key={key}
              className="fl-glass fl-elev-1 rounded-card p-6 transition-shadow duration-300 hover:shadow-[var(--fl-elev-2)]"
            >
              <div className="mb-2 font-display text-lg font-bold text-navy">
                {t(`${key}.title`)}
              </div>
              <p className="text-sm leading-relaxed text-ink-muted">{t(`${key}.body`)}</p>
            </div>
          ))}
        </Stagger>
      </div>
    </section>
  );
}
