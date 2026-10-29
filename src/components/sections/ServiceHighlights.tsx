/**
 * ServiceHighlights — the 3 "what we do" chips (AI Consulting, Apps & AI
 * agents, Training & Vibe Coding), moved out of the hero.
 *
 * These used to float absolutely-positioned inside/around GlobeHero (see
 * that file's git history) — moved here, as their own clean section right
 * after the hero, by request: the hero should carry only the headline/CTAs,
 * not overlapping card content. Same copy, same icons, same 3 items — just
 * relocated and restyled as a proper card row instead of floating chips.
 */
import { getTranslations } from 'next-intl/server';
import { MessageSquare, Code2, GraduationCap } from 'lucide-react';
import { Stagger } from '@/components/motion/Stagger';

const ITEMS = [
  { key: 'consulting', icon: MessageSquare },
  { key: 'apps', icon: Code2 },
  { key: 'training', icon: GraduationCap },
] as const;

export async function ServiceHighlights() {
  const t = await getTranslations('hero');
  const a = await getTranslations('a11y');

  return (
    <section aria-label={a('whatWeDo')} className="relative py-12 md:py-16">
      <div className="mx-auto max-w-5xl px-6">
        <Stagger className="grid gap-4 sm:grid-cols-3">
          {ITEMS.map(({ key, icon: Icon }) => (
            <div
              key={key}
              className="fl-glass fl-elev-1 flex items-center gap-3 rounded-card px-5 py-4 transition-shadow duration-300 hover:shadow-[var(--fl-elev-2)]"
            >
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-teal/10 text-teal-ink">
                <Icon size={18} strokeWidth={1.8} aria-hidden />
              </div>
              <span className="font-display text-sm font-semibold text-ink">
                {t(`chips.${key}`)}
              </span>
            </div>
          ))}
        </Stagger>
      </div>
    </section>
  );
}
