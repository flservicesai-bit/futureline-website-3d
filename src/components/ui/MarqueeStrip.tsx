/**
 * MarqueeStrip — looping horizontal ticker between sections.
 * Renders items twice for a seamless -50% loop.
 */
'use client'

interface MarqueeStripProps {
  items: string[]
  speed?: number
  direction?: 'left' | 'right'
  separator?: string
  className?: string
}

export function MarqueeStrip({
  items,
  speed = 28,
  direction = 'left',
  separator = '✦',
  className = '',
}: MarqueeStripProps) {
  const animationName =
    direction === 'left' ? 'marquee-left' : 'marquee-right'

  return (
    <div
      aria-hidden="true"
      className={`relative w-full overflow-hidden border-y border-hairline bg-navy py-8 ${className}`}
    >
      <div
        className="flex w-max gap-12 whitespace-nowrap will-change-transform"
        style={{
          animation: `${animationName} ${speed}s linear infinite`,
        }}
      >
        {[0, 1].map((copy) => (
          <div
            key={copy}
            className="flex shrink-0 items-center gap-12 pr-12"
          >
            {items.map((label, i) => (
              <span
                key={`${copy}-${i}`}
                className="flex shrink-0 items-center gap-12 text-3xl font-medium uppercase tracking-tight text-ink-muted md:text-5xl"
              >
                <span>{label}</span>
                <span className="text-brand-accent/70">{separator}</span>
              </span>
            ))}
          </div>
        ))}
      </div>

      <style jsx>{`
        @keyframes marquee-left {
          from {
            transform: translateX(0);
          }
          to {
            transform: translateX(-50%);
          }
        }
        @keyframes marquee-right {
          from {
            transform: translateX(-50%);
          }
          to {
            transform: translateX(0);
          }
        }
        @media (prefers-reduced-motion: reduce) {
          div[style*='animation'] {
            animation: none !important;
            transform: translateX(-25%);
          }
        }
      `}</style>
    </div>
  )
}
