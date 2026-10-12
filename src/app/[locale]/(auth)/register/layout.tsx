import { metadataFor } from '@/lib/seo';

// The page is a client component, so its title and description live here.
// Sign-in screens stay out of search results.
export const generateMetadata = metadataFor('register', '/register', { noIndex: true });

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
