import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
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

    // Auto-reply to the person, quoting their own topic and request back to
    // them. Sent for every enquiry route, including the get-started flow —
    // which reaches here after the visitor signs in with Google or email.
    notifyLeadConfirmation({
      name: firstName,
      email,
      topic: tourType || undefined,
      message,
      source: source || 'Website',
    });

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
