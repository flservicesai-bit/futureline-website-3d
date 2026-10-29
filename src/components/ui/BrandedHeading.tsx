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

// The FutureLine wordmark gradient, in the Living F logo's blues: light
// royal → royal → azure ("Line") → periwinkle (academy) → deep indigo. Both
// brand poles in one mark, so it reads as "FL" on every page regardless of
// which pole the page leans toward.
const FL_GRADIENT =
  'linear-gradient(90deg, #3D8FF0 0%, #1466DE 35%, #22A6F7 55%, #93AEFF 80%, #2A3475 100%)';

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
          ? { filter: 'drop-shadow(0 0 32px rgba(91, 123, 251, 0.2))' }
          : null),
      }}
    >
      {children}
    </Tag>
  );
}
