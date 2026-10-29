import { DetailsAuthForm } from '@/components/get-started/DetailsAuthForm';
import { metadataFor } from '@/lib/seo';

export const generateMetadata = metadataFor('getStartedDetails', '/get-started/details', { noIndex: true });

export default function GetStartedDetailsPage() {
  return <DetailsAuthForm />;
}
