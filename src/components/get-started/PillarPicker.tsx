/**
 * PillarPicker — /get-started (page 2). Pick one of the options, shown as
 * a vertical stacked list. On Continue, navigates to the real
 * /get-started/details route (not a step-state change) with the pick
 * carried as ?pillar=.
 *
 * Three options: the 3 company pillars (copy from the shared pillars.*
 * namespace, same as ThreePillars). The AI Readiness Assessment option
 * was removed by request.
 */
'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { MessageSquare, Code2, GraduationCap, ArrowRight } from 'lucide-react';
import { GetStartedShell } from './GetStartedShell';

const OPTIONS = [
  { key: 'consulting', icon: MessageSquare, ns: 'pillars' },
  { key: 'applications', icon: Code2, ns: 'pillars' },
  { key: 'training', icon: GraduationCap, ns: 'pillars' },
] as const;

type PillarKey = (typeof OPTIONS)[number]['key'];

function isPillarKey(v: string | null): v is PillarKey {
  return !!v && OPTIONS.some((p) => p.key === v);
}

function PickerInner() {
  const t = useTranslations('getStarted');
  const tp = useTranslations('pillars');
  const router = useRouter();
  const searchParams = useSearchParams();

  const [pillar, setPillar] = useState<PillarKey | null>(
    isPillarKey(searchParams.get('pillar')) ? (searchParams.get('pillar') as PillarKey) : null
  );

  function handleContinue() {
    if (!pillar) return;
    router.push(`/get-started/details?pillar=${pillar}`);
  }

  return (
    <GetStartedShell step={2} pillar={pillar ?? undefined}>
      <div className="mx-auto max-w-2xl">
        <div className="flex flex-col gap-4">
          {OPTIONS.map(({ key, icon: Icon, ns }) => {
            const selected = pillar === key;
            // Readiness copy lives under getStarted.*, the 3 pillars under
            // pillars.* — pick the right namespace per option.
            const tr = ns === 'pillars' ? tp : t;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setPillar(key)}
                className={`flex items-start gap-4 rounded-card border p-6 text-start transition-colors ${
                  selected
                    ? 'border-teal bg-teal/[0.06] ring-1 ring-teal'
                    : 'border-hairline bg-canvas-card hover:border-teal/40'
                }`}
                data-cursor="hover"
              >
                <div
                  className={`inline-flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl ${
                    selected ? 'bg-teal-ink text-white' : 'bg-teal/10 text-teal-ink'
                  }`}
                >
                  <Icon size={20} strokeWidth={1.8} aria-hidden />
                </div>
                <div>
                  <h3 className="mb-2 font-display text-base font-bold text-navy">
                    {tr(`${key}.title`)}
                  </h3>
                  <ul className="space-y-1.5">
                    {(tr.raw(`${key}.points`) as string[]).slice(0, 2).map((point) => (
                      <li key={point} className="relative ps-4 text-xs leading-relaxed text-ink-muted">
                        <span aria-hidden className="absolute start-0 top-[0.5em] h-1 w-1 rounded-full bg-teal" />
                        {point}
                      </li>
                    ))}
                  </ul>
                </div>
              </button>
            );
          })}
        </div>

        <div className="mt-8 flex justify-center">
          <button
            type="button"
            onClick={handleContinue}
            disabled={!pillar}
            className="fl-submit"
            data-cursor="magnetic"
          >
            {t('continue')}
            <ArrowRight size={15} className="rtl:rotate-180" />
          </button>
        </div>

      </div>
    </GetStartedShell>
  );
}

export function PillarPicker() {
  return (
    <Suspense fallback={null}>
      <PickerInner />
    </Suspense>
  );
}
