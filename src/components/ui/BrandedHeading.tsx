/**
 * BrandedHeading — the canonical section/page heading for the FL site.
 * ---------------------------------------------------------------------
 * One component, one source of truth. Use this for every H1 and H2 on
 * public-facing marketing pages so the brand stamp is consistent.
 *
 * What it does:
 *   - Applies the FutureLine wordmark gradient (royal → azure → periwinkle) as
 *     a bg-clip-text fill. Same gradient the hero wordmark uses.
 *   - Centres the text (and the block via mx-auto, so subheads/sub-CTAs
 *     placed inside the same container also centre cleanly).
 *   - font-black + tight tracking + py-2 descender buffer (bg-clip-text
 *     slices g/p/y descenders without that vertical padding).
 *
 * Sizes:
 *   - sm  → card/sub-section titles (~text-2xl/3xl)
 *   - md  → standard section H2 (~text-3xl/4xl/5xl)
 *   - lg  → marquee section H2 (the punchy ones — ~clamp 2.5–4.5rem)
 *   - xl  → page-hero H1 (~clamp 3–5rem)
 *
 * `glow` adds a soft drop-shadow in academy blue to lift the gradient
 * off dark backgrounds — use on heroes, skip on dense lists.
 */
import type { ReactNode } from 'react';

type Size = 'sm' | 'md' | 'lg' | 'xl';

type Props = {
  as?: 'h1' | 'h2' | 'h3';
  size?: Size;
  /** Soft glow drop-shadow behind the gradient. Default on for xl. */
  glow?: boolean;
  className?: string;
  id?: string;
  children: ReactNode;
};

const SIZE_CLASSES: Record<Size, string> = {
  sm: 'text-2xl md:text-3xl',
  md: 'text-3xl md:text-4xl lg:text-5xl',
  lg: 'text-4xl md:text-[clamp(2.5rem,5vw,4.5rem)]',
  xl: 'text-[2.5rem] sm:text-5xl md:text-[clamp(3rem,6vw,5rem)] lg:text-[clamp(3.25rem,6vw,5.5rem)]',
};

// The heading gradient follows the surface (globals.css): cream with a faint
// warm end on navy, navy into a lighter navy on cream.
const FL_GRADIENT = 'var(--fl-heading-gradient)';

export function BrandedHeading({
  as: Tag = 'h2',
  size = 'md',
  glow,
  className = '',
  id,
  children,
}: Props) {
  const shouldGlow = glow ?? size === 'xl';
  return (
    <Tag
      id={id}
      className={[
        'mx-auto block text-center font-black leading-[1.05] tracking-[-0.02em] py-2 bg-clip-text text-transparent',
        SIZE_CLASSES[size],
        className,
      ].join(' ')}
      style={{
        backgroundImage: FL_GRADIENT,
        WebkitBackgroundClip: 'text',
        ...(shouldGlow
          ? { filter: 'drop-shadow(0 0 32px rgba(244, 237, 224, 0.12))' }
          : null),
      }}
    >
      {children}
    </Tag>
  );
}
