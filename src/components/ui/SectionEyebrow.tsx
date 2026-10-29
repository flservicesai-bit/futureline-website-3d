/**
 * SectionEyebrow — the branded label that introduces every section.
 *
 * Replaces the old 12px mono caps that were easy to skim past. Now:
 * 14px mono caps with a glowing accent dot before the text and a
 * fading hairline after — matches the FL · Lab / FL · Academy hero
 * brand marks, telling the user "you're entering a new section,
 * here's the topic."
 *
 * Two accent variants: 'lab' (teal, default — FL Lab register) and
 * 'academy' (amber — FL Academy register). Both use the same shape.
 */
'use client';

type Accent = 'lab' | 'academy';

interface SectionEyebrowProps {
  children: React.ReactNode;
  accent?: Accent;
  className?: string;
}

const PALETTE: Record<Accent, {
  text: string;
  dot: string;
  dotGlow: string;
  hairline: string;
}> = {
  lab: {
    text: 'text-lab-ink',
    dot: 'bg-lab',
    dotGlow: '0 0 10px 2px rgba(24, 169, 153, 0.55)',
    hairline: 'from-lab/60',
  },
  academy: {
    text: 'text-academy',
    dot: 'bg-academy',
    dotGlow: '0 0 10px 2px rgba(91, 123, 251, 0.55)',
    hairline: 'from-academy/60',
  },
};

export function SectionEyebrow({
  children,
  accent = 'lab',
  className = 'mb-8',
}: SectionEyebrowProps) {
  const p = PALETTE[accent];
  return (
    <p
      className={`inline-flex items-center gap-3 font-mono text-[13px] font-semibold uppercase tracking-[0.32em] md:text-sm ${p.text} ${className}`}
    >
      <span
        aria-hidden="true"
        className={`block h-1.5 w-1.5 rounded-full ${p.dot}`}
        style={{ boxShadow: p.dotGlow }}
      />
      {children}
      <span
        aria-hidden="true"
        className={`ms-2 hidden h-px w-12 bg-gradient-to-r rtl:bg-gradient-to-l ${p.hairline} to-transparent md:block`}
      />
    </p>
  );
}
