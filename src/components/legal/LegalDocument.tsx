/**
 * LegalDocument — shared renderer for the /privacy and /terms pages.
 *
 * Content lives in the message catalogues (messages/{en,ar}.json) under
 * `legal.privacy` / `legal.terms`, so both locales render from the same
 * component and stay structurally in sync.
 *
 * Shape expected in the catalogue:
 *   { title, updated, intro, sections: [{ heading, body: string[] }] }
 *
 * `t.raw()` is used for the sections array; it has no missing-key fallback,
 * so the result is defensively checked before mapping — a malformed or
 * missing catalogue entry renders an empty document rather than throwing
 * and 500-ing the route.
 */
import { getTranslations } from 'next-intl/server';

type Section = { heading: string; body: string[] };

export async function LegalDocument({ namespace }: { namespace: 'privacy' | 'terms' }) {
  const t = await getTranslations(`legal.${namespace}`);

  const raw = t.raw('sections') as unknown;
  const sections: Section[] = Array.isArray(raw)
    ? (raw as Section[]).filter(
        (s) => s && typeof s.heading === 'string' && Array.isArray(s.body),
      )
    : [];

  return (
    <main className="fl-light relative bg-canvas text-ink">
      <section className="relative py-20 md:py-28">
        <div className="mx-auto max-w-3xl px-6">
          <p className="mb-3 font-display text-sm font-semibold uppercase tracking-[0.3em] text-teal-ink">
            {t('eyebrow')}
          </p>
          <h1 className="font-display text-4xl font-bold tracking-tight text-navy md:text-5xl">
            {t('title')}
          </h1>
          <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.2em] text-ink-muted">
            {t('updatedLabel')} {t('updated')}
          </p>

          <p className="mt-8 text-base leading-relaxed text-ink-muted">{t('intro')}</p>

          <div className="mt-12 space-y-10">
            {sections.map((section, i) => (
              <section key={`${i}-${section.heading}`} className="scroll-mt-24">
                <h2 className="font-display text-xl font-bold tracking-tight text-navy md:text-2xl">
                  <span aria-hidden className="me-2 text-teal-ink">
                    {i + 1}.
                  </span>
                  {section.heading}
                </h2>
                <div className="mt-3 space-y-3">
                  {section.body.map((para, j) => (
                    <p key={j} className="text-sm leading-relaxed text-ink-muted">
                      {para}
                    </p>
                  ))}
                </div>
              </section>
            ))}
          </div>

          <div className="mt-16 rounded-card border border-hairline bg-canvas-card p-6 fl-elev-1">
            <p className="text-sm leading-relaxed text-ink-muted">
              {t('contactNote')}{' '}
              <a
                href="mailto:flservices.ai@gmail.com"
                className="font-semibold text-teal-ink transition-colors hover:text-navy"
              >
                flservices.ai@gmail.com
              </a>
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
