'use client';

import { useEffect, useRef, useState } from 'react';

/* ─── Keyframes injected once into <head> ────────────────────────────────── */
const KEYFRAMES = `
  @keyframes shimmer-sweep {
    from { transform: translateX(-110%); }
    to   { transform: translateX(210%);  }
  }
  @keyframes border-breathe {
    0%, 100% { opacity: 0.15; }
    50%       { opacity: 0.65; }
  }
  @keyframes zero-pop {
    0%   { transform: scale(1);    filter: brightness(1);   }
    35%  { transform: scale(1.18); filter: brightness(1.5); }
    65%  { transform: scale(0.94); filter: brightness(1.1); }
    100% { transform: scale(1);    filter: brightness(1);   }
  }
`;

/* ─── Counter hook (rAF + ease-out) ─────────────────────────────────────── */
function easeOut(t: number) {
  return 1 - (1 - t) ** 3;
}

function useCountUp(target: number, duration: number, active: boolean): number {
  const [val, setVal] = useState(0);

  useEffect(() => {
    if (!active || target === 0) return;
    let rafId: number;
    const startTime = performance.now();

    const tick = (now: number) => {
      const progress = Math.min((now - startTime) / duration, 1);
      setVal(Math.round(easeOut(progress) * target));
      if (progress < 1) rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [active, target, duration]);

  return val;
}

/* ─── Card definitions ───────────────────────────────────────────────────── */
/**
 * display   — when set, shows this string instead of the counter value.
 *             Use for range strings like "40–60%".
 * isZero    — true on the "0 Manual Errors" card to trigger the pop animation.
 */
interface CardDef {
  target: number;
  suffix: string;
  display?: string;   // overrides counter when present (range values)
  isZero?: boolean;   // triggers spring pop animation
  label: string;
  sub: string;
  color: string;
  borderClass: string;
  gradClass: string;
  delay: number;
  breatheDelay: string;
}

const CARDS: CardDef[] = [
  {
    target: 5,
    suffix: '×',
    label: 'Faster Delivery',
    sub: 'vs manual processes',
    color: '#22a6f7',
    borderClass: 'border-teal-500/20',
    gradClass: 'from-teal-500/[0.12] to-teal-500/[0.04]',
    delay: 0,
    breatheDelay: '0s',
  },
  {
    target: 0,
    suffix: '',
    display: '40–60%',          // range — no counter animation
    label: 'Cost Reduction',
    sub: 'average across clients',
    color: '#60a5fa',
    borderClass: 'border-blue-500/20',
    gradClass: 'from-blue-500/[0.12] to-blue-500/[0.04]',
    delay: 130,
    breatheDelay: '0.75s',
  },
  {
    target: 0,
    suffix: '',
    isZero: true,               // spring pop on "0"
    label: 'Manual Errors',
    sub: 'with automated workflows',
    color: '#c084fc',
    borderClass: 'border-purple-500/20',
    gradClass: 'from-purple-500/[0.12] to-purple-500/[0.04]',
    delay: 260,
    breatheDelay: '1.5s',
  },
  {
    target: 100,
    suffix: '%',
    label: 'Custom-Built',
    sub: 'no off-the-shelf compromises',
    color: '#22d3ee',
    borderClass: 'border-cyan-500/20',
    gradClass: 'from-cyan-500/[0.12] to-cyan-500/[0.04]',
    delay: 390,
    breatheDelay: '2.25s',
  },
];

/* ─── Single animated card ───────────────────────────────────────────────── */
function MetricCard({ card, active }: { card: CardDef; active: boolean }) {
  // Only count up when no static display string is provided
  const count = useCountUp(card.display ? 0 : card.target, 1500, active);
  const [entered, setEntered] = useState(false);
  const [showShimmer, setShowShimmer] = useState(false);
  const [zeroPop, setZeroPop] = useState(false);
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    if (!active) return;

    let t2: ReturnType<typeof setTimeout>;
    let t3: ReturnType<typeof setTimeout>;

    const t1 = setTimeout(() => {
      setEntered(true);
      t2 = setTimeout(() => setShowShimmer(true), 400);
      // Only the "0 Manual Errors" card gets the spring pop
      if (card.isZero) {
        t3 = setTimeout(() => setZeroPop(true), 620);
      }
    }, card.delay);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [active, card.delay, card.isZero]);

  // Use the static display string when provided, otherwise use counter
  const displayValue = card.display ?? `${count}${card.suffix}`;

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        opacity: entered ? 1 : 0,
        transform: !entered
          ? 'translateY(22px) scale(0.95)'
          : hovered
          ? 'translateY(-7px) scale(1.025)'
          : 'translateY(0) scale(1)',
        transition: entered
          ? 'opacity 0.5s ease, transform 0.4s cubic-bezier(0.34,1.4,0.64,1), box-shadow 0.3s ease'
          : 'none',
        boxShadow: hovered
          ? `0 20px 48px ${card.color}22, 0 0 0 1px ${card.color}45`
          : 'none',
      }}
      className={`relative rounded-2xl border ${card.borderClass} bg-gradient-to-br ${card.gradClass} backdrop-blur-sm p-5 overflow-hidden cursor-default`}
    >
      {/* Breathing border glow */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: 'inherit',
          boxShadow: `inset 0 0 0 1px ${card.color}`,
          animation: `border-breathe 3s ease-in-out ${card.breatheDelay} infinite`,
          pointerEvents: 'none',
        }}
      />

      {/* Shimmer sweep — fires once */}
      {showShimmer && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: `linear-gradient(105deg, transparent 30%, ${card.color}28 50%, transparent 70%)`,
            animation: 'shimmer-sweep 0.75s ease-out 1 forwards',
            pointerEvents: 'none',
          }}
        />
      )}

      {/* Metric value */}
      <div
        style={{
          color: card.color,
          animation: zeroPop
            ? 'zero-pop 0.55s cubic-bezier(0.34,1.56,0.64,1) forwards'
            : undefined,
        }}
        className="text-4xl font-black mb-1 tabular-nums"
      >
        {displayValue}
      </div>

      <div className="text-sm font-bold text-navy mb-1">{card.label}</div>
      <div className="text-xs text-ink-muted">{card.sub}</div>
    </div>
  );
}

/* ─── Container — injects keyframes + observes viewport ─────────────────── */
export default function MetricCards() {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);

  /* inject keyframes exactly once */
  useEffect(() => {
    const id = 'metric-cards-kf';
    if (document.getElementById(id)) return;
    const el = document.createElement('style');
    el.id = id;
    el.textContent = KEYFRAMES;
    document.head.appendChild(el);
  }, []);

  /* fire animations when grid enters viewport (once) */
  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setActive(true);
          obs.disconnect();
        }
      },
      { threshold: 0.25 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div ref={wrapperRef} className="hidden lg:grid grid-cols-2 gap-4">
      {CARDS.map((card) => (
        <MetricCard key={card.label} card={card} active={active} />
      ))}
    </div>
  );
}
