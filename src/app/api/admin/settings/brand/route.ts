import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const settings = await prisma.brandSettings.findFirst();
    const defaults = {
      companyName: 'FutureLine',
      tagline: 'Design • Deploy • Evolve',
      primaryColor: '#0F1E3D',
      accentColor: '#18A999',
      logo: '',
      contactEmail: 'flservices.ai@gmail.com',
      tourismEmail: 'authentic.tour.om@gmail.com',
      bankPayee: 'Musab Al Sabahi, 96532326',
      receiptWhatsapp: '96532326',
    };
    return NextResponse.json({ ...defaults, ...settings });
  } catch {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const data = await req.json();
    let settings = await prisma.brandSettings.findFirst();
    if (settings) {
      settings = await prisma.brandSettings.update({ where: { id: settings.id }, data });
    } else {
      settings = await prisma.brandSettings.create({ data });
    }
    return NextResponse.json(settings);
  } catch (error: any) {
    return NextResponse.json({ error: "An error occurred" }, { status: 400 });
  }
}
