import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { HONEYPOT_FIELD } from '@/components/Honeypot';
import { leadSchema, formatZodError } from '@/lib/validations';
import { rateLimit, getRateLimitHeaders, getClientIp } from '@/lib/rateLimit';
import { notifyLeadConfirmation, notifyAdminNewLead } from '@/lib/notifications';

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req);
    const rl = await rateLimit(`leads:${ip}`, 5, 60 * 1000);
    if (!rl.success) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429, headers: getRateLimitHeaders(rl.remaining, rl.resetIn) }
      );
    }

    const body = await req.json();

    // A filled honeypot means a bot. Answer as if it worked so it doesn't
    // adapt, but save nothing and send nothing.
    const trap = body?.[HONEYPOT_FIELD];
    if (typeof trap === 'string' && trap.trim() !== '') {
      console.warn(`Lead dropped: honeypot filled (ip ${ip})`);
      return NextResponse.json({ success: true });
    }

    const parsed = leadSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: formatZodError(parsed.error) }, { status: 400 });
    }
    const { firstName, lastName, email, phone, company, tourType, message, source } = parsed.data;

    const lead = await prisma.lead.create({
      data: {
        firstName,
        lastName,
        email,
        phone: phone || null,
        company: company || null,
        tourType: tourType || 'General Enquiry',
        message,
        source: source || 'Website',
        stage: 'NEW',
        priority: 'MEDIUM',
      },
    });

    await prisma.leadActivity.create({
      data: {
        leadId: lead.id,
        type: 'LEAD_CREATED',
        description: `New lead submitted via ${source || 'Website'} contact form`,
      },
    });

    // Auto-reply to the address on the form. Anyone can type any address, so
    // one address gets at most two of these an hour (the lead is still saved
    // and the team still told), and the request is quoted back only to
    // someone signed in as that address, as in the get-started flow.
    // Otherwise the form would send any text to any inbox from our domain.
    const reply = await rateLimit(`lead-reply:${email}`, 2, 60 * 60 * 1000);
    if (reply.success) {
      const session = await getServerSession(authOptions);
      notifyLeadConfirmation({
        name: firstName,
        email,
        topic: tourType || undefined,
        message: session?.user?.email?.toLowerCase() === email ? message : undefined,
        source: source || 'Website',
      });
    }

    notifyAdminNewLead({
      name: `${firstName} ${lastName}`,
      email,
      phone: phone || undefined,
      tourType: tourType || 'General Enquiry',
      message,
      source: source || 'Website',
    });

    return NextResponse.json({ success: true, id: lead.id });
  } catch (error) {
    console.error('Lead creation error:', error);
    return NextResponse.json({ error: 'Failed to submit enquiry' }, { status: 500 });
  }
}
