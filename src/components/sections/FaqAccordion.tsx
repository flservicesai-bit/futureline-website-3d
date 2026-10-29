/**
 * FaqAccordion — native <details>/<summary>.
 *
 * Deliberately not a JS accordion: <details> gives keyboard support, screen
 * reader semantics, and in-page find (browsers expand a collapsed section to
 * reveal a search hit) for free, and it works before hydration.
 *
 * Emits FAQPage JSON-LD from the same array it renders, so the structured
 * data can never drift from what's on screen.
 */
import { getTranslations } from 'next-intl/server';
import { faqJsonLd, type FaqItem } from '@/content/home';

export async function FaqAccordion() {
  const t = await getTranslations('faq');
  const items = t.raw('items') as FaqItem[];
  return (
    <section id="faq" aria-labelledby="faq-heading" className="relative py-20 md:py-28">
      <script
        type="application/ld+json"
        // Escape '<' so a '</script>' in any FAQ string can't break out of the
        // script element, even though today the content is developer-authored.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd(items)).replace(/</g, '\\u003c') }}
      />
      <div className="mx-auto grid max-w-6xl gap-12 px-6 lg:grid-cols-[0.8fr_1.2fr]">
        <div>
          <p className="mb-3 font-display text-sm font-semibold uppercase tracking-[0.3em] text-teal-ink">
            {t('eyebrow')}
          </p>
          {/* h1: this section is the whole /faq page and its only heading. */}
          <h1
            id="faq-heading"
            className="font-display text-4xl font-bold tracking-tight text-navy md:text-5xl"
          >
            {t('heading')}
          </h1>
        </div>

        <div className="space-y-3">
          {items.map((item, i) => (
            <details
              key={item.question}
              open={i === 0}
              className="group rounded-card border border-hairline bg-canvas-card p-5 fl-elev-1 [&_summary::-webkit-details-marker]:hidden"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-display font-semibold text-navy">
                {item.question}
                <span
                  aria-hidden
                  className="shrink-0 text-2xl font-light text-teal-ink transition-transform duration-300 group-open:rotate-45"
                >
                  +
                </span>
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-ink-muted">{item.answer}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
