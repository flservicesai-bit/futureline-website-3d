import { metadataFor } from '@/lib/seo';
import { LegalDocument } from '@/components/legal/LegalDocument';

export const generateMetadata = metadataFor('terms', '/terms');

export default function TermsPage() {
  return <LegalDocument namespace="terms" />;
}
