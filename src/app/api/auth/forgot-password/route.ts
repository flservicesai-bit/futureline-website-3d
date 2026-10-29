import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import { sendEmail } from '@/lib/notifications';
import { rateLimit, getRateLimitHeaders, getClientIp } from '@/lib/rateLimit';
import { z } from 'zod';
import { emailField } from '@/lib/validations';
import { findUserByEmail } from '@/lib/user-email';
import { siteLink } from '@/lib/site-link';

const forgotPasswordSchema = z.object({
  email: emailField,
});

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req);
    const rl = await rateLimit(`forgot-password:${ip}`, 3, 60 * 1000);
    if (!rl.success) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429, headers: getRateLimitHeaders(rl.remaining, rl.resetIn) }
      );
    }

    const body = await req.json();
    const parsed = forgotPasswordSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { message: 'If an account exists with that email, we have sent a password reset link.' },
        { status: 200 }
      );
    }

    const { email } = parsed.data;
    const user = await findUserByEmail(email);

    if (user && user.isActive) {
      const rawToken = crypto.randomBytes(32).toString('hex');
      const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');
      const expiry = new Date(Date.now() + 60 * 60 * 1000);

      await prisma.user.update({
        where: { id: user.id },
        data: {
          resetToken: hashedToken,
          resetTokenExpiry: expiry,
        },
      });

      const resetUrl = siteLink(req, `/reset-password?token=${rawToken}`);

      await sendEmail({
        to: user.email,
        subject: 'FutureLine - Password Reset Request',
        body: `Dear ${user.firstName},\n\nWe received a request to reset your password.\n\nClick the link below to set a new password:\n${resetUrl}\n\nThis link will expire in 1 hour.\n\nIf you did not request this, please ignore this email.\n\nBest regards,\nFutureLine Team`,
        metadata: { type: 'password_reset', userId: user.id },
      });
    }

    return NextResponse.json({
      message: 'If an account exists with that email, we have sent a password reset link.',
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json({
      message: 'If an account exists with that email, we have sent a password reset link.',
    });
  }
}
