import { metadataFor } from '@/lib/seo';
import { PillarPicker } from '@/components/get-started/PillarPicker';

export const generateMetadata = metadataFor('getStarted', '/get-started');

export default function GetStartedPage() {
  return <PillarPicker />;
}
