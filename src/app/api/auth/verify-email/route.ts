import { NextResponse } from 'next/server';
import { consumeVerifyToken } from '@/lib/email-verification';
import { rateLimit, getRateLimitHeaders, getClientIp } from '@/lib/rateLimit';

/**
 * POST { token } — confirms the address the token was emailed to. POST (from
 * a button on /verify-email), not a GET on the link itself: mail scanners
 * open links, and must not confirm an address its owner never saw.
 */
export async function POST(req: Request) {
  const rl = await rateLimit(`verify-email:${getClientIp(req)}`, 10, 60 * 1000);
  if (!rl.success) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429, headers: getRateLimitHeaders(rl.remaining, rl.resetIn) },
    );
  }
  const body = await req.json().catch(() => null);
  const token = typeof body?.token === 'string' ? body.token : '';
  if (!token || !(await consumeVerifyToken(token))) {
    return NextResponse.json({ error: 'This link is invalid or has expired.' }, { status: 400 });
  }
  return NextResponse.json({ verified: true });
}
