import { getTranslations } from 'next-intl/server';
import {
  ServiceDetailLayout,
  type ServiceDetailData,
} from '@/components/sections/ServiceDetailLayout';
import { metadataFor } from '@/lib/seo';

export const generateMetadata = metadataFor('servicesDigitalisation', '/services/digitalisation');

export default async function DigitalisationPage() {
  const t = await getTranslations('servicePages.digitalisation');

  const data: ServiceDetailData = {
    eyebrow: t('eyebrow'),
    pageNumber: '01',
    heading: t('heading'),
    subhead: t('subhead'),
    marqueeItems: t.raw('marqueeItems') as string[],
    painPoints: t.raw('painPoints') as ServiceDetailData['painPoints'],
    process: t.raw('process') as ServiceDetailData['process'],
    deliverables: t.raw('deliverables') as string[],
    compare: t.raw('compare') as ServiceDetailData['compare'],
    industries: t.raw('industries') as ServiceDetailData['industries'],
    faqs: t.raw('faqs') as ServiceDetailData['faqs'],
    cta: {
      eyebrow: t('cta.eyebrow'),
      headline: t('cta.headline'),
      sub: t('cta.sub'),
      primary: { label: t('cta.primaryLabel'), href: '/audit' },
      secondary: { label: t('cta.secondaryLabel'), href: '/services' },
    },
  };

  return <ServiceDetailLayout data={data} />;
}
