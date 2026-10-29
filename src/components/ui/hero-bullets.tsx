'use client';

import { useEffect, useRef, useState } from 'react';
import { CheckCircle2 } from 'lucide-react';

const POINTS = [
  'Replace slow manual processes with lean digital workflows that scale with your business',
  'Turn scattered data into decisions your leadership team can act on immediately',
  'Move faster than your competitors — without enterprise budgets or multi-year rollouts',
  'Build once, operate forever — systems designed for your people, not against them',
];

export default function HeroBullets() {
  const ref = useRef<HTMLUListElement>(null);
  const [visibleCount, setVisibleCount] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Observe the list; fire once when it enters viewport
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        obs.disconnect();

        // Stagger each bullet 200 ms apart
        POINTS.forEach((_, i) => {
          setTimeout(() => {
            setVisibleCount((prev) => Math.max(prev, i + 1));
          }, i * 200);
        });
      },
      { threshold: 0.2 },
    );

    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <ul ref={ref} className="space-y-4 mb-8">
      {POINTS.map((point, i) => (
        <li
          key={point}
          style={{
            opacity: visibleCount > i ? 1 : 0,
            transform: visibleCount > i ? 'translateY(0)' : 'translateY(14px)',
            transition:
              visibleCount > i
                ? 'opacity 0.45s ease, transform 0.45s cubic-bezier(0.22,1,0.36,1)'
                : 'none',
          }}
          className="flex items-start gap-3"
        >
          <CheckCircle2 size={18} className="text-[#1466de] flex-shrink-0 mt-0.5" />
          <span className="text-ink-muted leading-relaxed">{point}</span>
        </li>
      ))}
    </ul>
  );
}
