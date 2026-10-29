import { prisma } from '@/lib/prisma';

const DEFAULTS = {
  companyName: 'FutureLine',
  tagline: 'Design • Deploy • Evolve',
  primaryColor: '#011C41',
  accentColor: '#1466DE',
  logo: null as string | null,
  contactEmail: 'flservices.ai@gmail.com',
  tourismEmail: 'authentic.tour.om@gmail.com',
  bankPayee: 'Musab Al Sabahi, 96532326',
  receiptWhatsapp: '96532326',
};

export async function getBrandSettings() {
  try {
    const settings = await prisma.brandSettings.findFirst();
    return {
      ...DEFAULTS,
      ...settings,
    };
  } catch {
    return { ...DEFAULTS };
  }
}
