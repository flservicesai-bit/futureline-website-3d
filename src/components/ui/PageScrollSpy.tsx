/**
 * PageScrollSpy — hairline left rail with section dots that highlights
 * the active section as the user scrolls. Desktop-only (xl+) so it
 * doesn't compete with content on smaller screens.
 *
 * Section labels show on hover. Click a dot to smooth-scroll to that
 * section. Uses IntersectionObserver to track which section is in view;
 * picks the one whose top is closest to the top of the viewport.
 */
'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';

export interface ScrollSpySection {
  id: string;
  label: string;
}

export function PageScrollSpy({ sections }: { sections: ScrollSpySection[] }) {
  const a = useTranslations('a11y');
  const [active, setActive] = useState<string>(sections[0]?.id ?? '');

  useEffect(() => {
    if (sections.length === 0) return;
    const elements = sections
      .map((s) => document.getElementById(s.id))
      .filter((el): el is HTMLElement => el !== null);

    const observer = new IntersectionObserver(
      (entries) => {
        // Pick the entry closest to the top of the viewport that's intersecting.
        const visible = entries.filter((e) => e.isIntersecting);
        if (visible.length === 0) return;
        const top = visible.reduce((best, e) =>
          e.boundingClientRect.top < best.boundingClientRect.top ? e : best,
        );
        setActive(top.target.id);
      },
      { rootMargin: '-30% 0px -55% 0px', threshold: 0 },
    );
    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [sections]);

  return (
    <nav
      aria-label={a('onThisPage')}
      className="pointer-events-none fixed start-6 top-1/2 z-30 hidden -translate-y-1/2 xl:block"
    >
      <ul className="pointer-events-auto flex flex-col gap-3.5">
        {sections.map((s) => {
          const isActive = active === s.id;
          return (
            <li key={s.id}>
              <a
                href={`#${s.id}`}
                className="group flex items-center gap-3"
                aria-current={isActive ? 'true' : undefined}
                data-cursor="hover"
              >
                <span
                  aria-hidden="true"
                  className={[
                    'block h-1.5 rounded-full transition-all duration-300',
                    isActive ? 'w-6 bg-lab' : 'w-3 bg-ink/25 group-hover:bg-ink/50',
                  ].join(' ')}
                  style={isActive ? { boxShadow: '0 0 10px 2px rgba(20,102,222,0.55)' } : undefined}
                />
                <span
                  className={[
                    'whitespace-nowrap font-mono text-[10px] uppercase tracking-[0.28em] transition-all duration-300',
                    isActive
                      ? 'text-lab-ink opacity-100'
                      : 'text-ink-muted opacity-0 group-hover:opacity-100',
                  ].join(' ')}
                >
                  {s.label}
                </span>
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
