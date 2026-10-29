import { ConfirmPanel } from '@/components/get-started/ConfirmPanel';
import { metadataFor } from '@/lib/seo';

// PLACEHOLDER page — see ConfirmPanel.tsx's doc comment. Real design
// pending a reference image from the user.
export const generateMetadata = metadataFor('getStartedConfirm', '/get-started/confirm', { noIndex: true });

export default function GetStartedConfirmPage() {
  return <ConfirmPanel />;
}
