import { metadataFor } from '@/lib/seo';
import { FaqAccordion } from '@/components/sections/FaqAccordion';

export const generateMetadata = metadataFor('faq', '/faq');

// Moved out of the home page so it gets its own page instead of stacking
// at the bottom of everything else — see HANDOFF.md and the Header/Footer
// link updates that point here now. FaqAccordion still emits its own
// FAQPage JSON-LD, unchanged.
export default function FaqPage() {
  return (
    <main className="fl-light relative bg-canvas text-ink">
      <FaqAccordion />
    </main>
  );
}
