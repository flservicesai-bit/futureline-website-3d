import { SignInPanel } from '@/components/get-started/SignInPanel';
import { metadataFor } from '@/lib/seo';

export const generateMetadata = metadataFor('getStartedSignin', '/get-started/signin', { noIndex: true });

export default function GetStartedSignInPage() {
  return <SignInPanel />;
}
