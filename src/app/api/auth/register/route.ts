import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { registerSchema, formatZodError } from '@/lib/validations';
import { rateLimit, getRateLimitHeaders, getClientIp } from '@/lib/rateLimit';
import { notifyWelcome } from '@/lib/notifications';
import { findUserByEmail } from '@/lib/user-email';
import { issueVerifyToken } from '@/lib/email-verification';
import { siteLink } from '@/lib/site-link';

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req);
    const rl = await rateLimit(`register:${ip}`, 5, 60 * 1000);
    if (!rl.success) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429, headers: getRateLimitHeaders(rl.remaining, rl.resetIn) }
      );
    }

    const body = await req.json();
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: formatZodError(parsed.error) }, { status: 400 });
    }
    const { firstName, lastName, email, password } = parsed.data;

    // `email` is already lower-case; this also catches older mixed-case rows.
    const existing = await findUserByEmail(email);
    if (existing) {
      return NextResponse.json({ error: 'Email already registered' }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: { firstName, lastName, email, password: hashedPassword, role: 'CUSTOMER' },
    });

    const verifyUrl = siteLink(req, `/verify-email?token=${await issueVerifyToken(user.id)}`);
    notifyWelcome({ name: `${user.firstName} ${user.lastName}`.trim(), email: user.email }, verifyUrl).catch((err) =>
      console.error('[Register] Failed to send welcome email:', err)
    );

    return NextResponse.json({ id: user.id, email: user.email });
  } catch (error) {
    return NextResponse.json({ error: 'Registration failed' }, { status: 500 });
  }
}
