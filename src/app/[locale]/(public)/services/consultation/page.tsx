import { getTranslations } from 'next-intl/server';
import {
  ServiceDetailLayout,
  type ServiceDetailData,
} from '@/components/sections/ServiceDetailLayout';
import { metadataFor } from '@/lib/seo';

export const generateMetadata = metadataFor('servicesConsultation', '/services/consultation');

export default async function ConsultationPage() {
  const t = await getTranslations('servicePages.consultation');

  const data: ServiceDetailData = {
    eyebrow: t('eyebrow'),
    pageNumber: '04',
    heading: t('heading'),
    subhead: t('subhead'),
    marqueeItems: t.raw('marqueeItems') as string[],
    painHeading: t('painHeading'),
    painPoints: t.raw('painPoints') as ServiceDetailData['painPoints'],
    processHeading: t('processHeading'),
    processSubhead: t('processSubhead'),
    process: t.raw('process') as ServiceDetailData['process'],
    deliverablesHeading: t('deliverablesHeading'),
    deliverables: t.raw('deliverables') as string[],
    commitment: t.raw('commitment') as ServiceDetailData['commitment'],
    compare: t.raw('compare') as ServiceDetailData['compare'],
    stats: t.raw('stats') as ServiceDetailData['stats'],
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
