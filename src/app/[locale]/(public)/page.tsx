import { getLocale, getTranslations } from 'next-intl/server';
import { jsonLdScript, metadataFor, organizationJsonLd } from '@/lib/seo';
import { AmbientMesh } from '@/components/ui/AmbientMesh';
import { GlobeHero } from '@/components/sections/GlobeHero';
import { ThreeActStory } from '@/components/sections/ThreeActStory';
import { DifferentiatorStrip } from '@/components/sections/DifferentiatorStrip';
import { WhoWeServe } from '@/components/sections/WhoWeServe';

// Note: this page used to be force-dynamic solely because NeuralPathway's
// featured-course Prisma read lived here. NeuralPathway (+ that query) has
// moved to /courses — see that page for the admin `featuredSlot` wiring.
// Home can now render statically/cached again.
//
// ThreePillars (the 3 pillar cards) was removed from here by request — the
// options live on /get-started (page 2 of that flow) instead. Header,
// Footer, and the hero's "What we offer" CTA all point there instead of
// the old #services in-page anchor.
//
// ServiceHighlights (the 3 hero chips — AI Consulting / Apps & AI agents /
// Training & Vibe Coding, briefly given their own section here) was removed
// from home too, by the same request extended further: don't duplicate the
// service cards on the home page at all — /get-started already shows the
// same 3 categories, in more detail, vertically. ServiceHighlights.tsx is
// left in place (unused component, no functional risk) in case it's wanted
// again.
//
// ThreeActStory ("01 we advise / 02 we build / 03 we train") is back here
// in its original repo position after the hero. Vision & Mission is NOT a
// separate section any more — by request it renders as the capstone of
// that story's final act ("then we hand you the keys"), inside
// ThreeActStory itself. VisionMission.tsx is now unused but left in
// place. The /about route it briefly lived on has been removed; the
// Header/Footer "Vision" links point at the story section, which is
// where the vision copy now lives.

export const generateMetadata = metadataFor('home', '');

export default async function Home() {
  const locale = await getLocale();
  const t = await getTranslations({ locale, namespace: 'meta' });
  return (
    <main className="fl-light relative bg-canvas text-ink">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLdScript(organizationJsonLd(locale, t('home.description'))),
        }}
      />
      <AmbientMesh />

      <div className="relative z-10">
        <GlobeHero />
      </div>

      <div className="relative z-10">
        <ThreeActStory />
        <DifferentiatorStrip />
        <WhoWeServe />
      </div>
    </main>
  );
}
