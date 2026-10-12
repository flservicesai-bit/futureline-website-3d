import { getTranslations } from 'next-intl/server';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import InactivityWatcher from '@/components/InactivityWatcher';
import { SmoothScrollProvider } from '@/components/providers/SmoothScrollProvider';
import { SplashIntro } from '@/components/ui/SplashIntro';
import { CoursePromoDialog } from '@/components/ui/CoursePromoDialog';

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const t = await getTranslations('common');
  return (
    <SmoothScrollProvider>
      <SplashIntro />
      <InactivityWatcher timeoutMinutes={60} />
      {/* Skip link — the site had none. First tab stop on every page. */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:start-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-navy focus:px-4 focus:py-2 focus:font-display focus:text-sm focus:font-semibold focus:text-white"
      >
        {t('skipToContent')}
      </a>
      <Header />
      <div id="main-content" className="min-h-screen">
        {children}
      </div>
      <Footer />
      <CoursePromoDialog />
    </SmoothScrollProvider>
  );
}
