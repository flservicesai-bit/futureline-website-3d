import { metadataFor } from '@/lib/seo';
import { LegalDocument } from '@/components/legal/LegalDocument';

export const generateMetadata = metadataFor('privacy', '/privacy');

export default function PrivacyPage() {
  return <LegalDocument namespace="privacy" />;
}
