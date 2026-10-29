/**
 * Footer — light footer for the redesigned public site.
 *
 * Columns follow the company profile: the three pillars, the company links,
 * and the Muscat location. Uses the locale-aware Link so an Arabic visitor
 * stays in Arabic when navigating.
 */
import Image from 'next/image';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/routing';

interface FooterColProps {
  title: string;
  links: { label: string; href: string }[];
}

function FooterCol({ title, links }: FooterColProps) {
  return (
    <div>
      <h3 className="mb-5 font-display text-xs font-semibold uppercase tracking-[0.2em] text-ink-muted">
        {title}
      </h3>
      <ul className="space-y-3">
        {links.map((l) => (
          <li key={l.label}>
            <Link
              href={l.href}
              className="text-sm text-ink-muted transition-colors hover:text-teal-ink"
              data-cursor="hover"
            >
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default async function Footer() {
  const t = await getTranslations('footer');
  const a = await getTranslations('a11y');
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-hairline bg-canvas-alt px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="grid grid-cols-1 gap-12 md:grid-cols-4">
          <div className="md:col-span-2">
            <Link href="/" className="mb-4 inline-flex items-center gap-2.5" aria-label={a('home')}>
              <Image
                src="/images/logo-mark.png"
                alt=""
                width={28}
                height={28}
                className="h-7 w-7"
              />
              <span className="font-display text-lg font-bold tracking-tight text-navy">
                FutureLine
              </span>
            </Link>
            <p className="max-w-xs font-display text-base font-semibold text-navy">
              {t('tagline')}
            </p>
            <p className="mt-5 text-sm text-ink-muted">{t('location')}</p>
          </div>

          <FooterCol
            title={t('whatWeOffer')}
            links={[
              { label: t('links.consulting'), href: '/get-started?pillar=consulting' },
              { label: t('links.applications'), href: '/get-started?pillar=applications' },
              { label: t('links.training'), href: '/courses' },
            ]}
          />

          <FooterCol
            title={t('company')}
            links={[
              { label: t('links.visionMission'), href: '/#story' },
              { label: t('links.whoWeServe'), href: '/#who-we-serve' },
              { label: t('links.faq'), href: '/faq' },
              { label: t('links.readiness'), href: '/audit' },
            ]}
          />
        </div>

        <div className="mt-14 flex flex-col gap-3 border-t border-hairline pt-8 text-sm text-ink-muted sm:flex-row sm:items-center sm:justify-between">
          <p>&copy; {year} FutureLine.ai. {t('rights')}</p>
          <p>
            <Link href="/courses" className="transition-colors hover:text-teal-ink">
              {t('links.courses')}
            </Link>
            <span aria-hidden className="mx-2">
              ·
            </span>
            <Link href="/audit" className="transition-colors hover:text-teal-ink">
              {t('links.audit')}
            </Link>
            <span aria-hidden className="mx-2">
              ·
            </span>
            <Link href="/privacy" className="transition-colors hover:text-teal-ink">
              {t('links.privacy')}
            </Link>
            <span aria-hidden className="mx-2">
              ·
            </span>
            <Link href="/terms" className="transition-colors hover:text-teal-ink">
              {t('links.terms')}
            </Link>
          </p>
        </div>
      </div>
    </footer>
  );
}
