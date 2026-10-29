import { prisma } from './prisma';

export async function rateLimit(
  identifier: string,
  limit: number = 10,
  windowMs: number = 60 * 1000
): Promise<{ success: boolean; remaining: number; resetIn: number }> {
  const now = new Date();

  try {
    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.rateLimit.findUnique({
        where: { key: identifier },
      });

      if (!existing || existing.resetTime < now) {
        const resetTime = new Date(Date.now() + windowMs);
        await tx.rateLimit.upsert({
          where: { key: identifier },
          create: { key: identifier, count: 1, resetTime },
          update: { count: 1, resetTime },
        });
        return { count: 1, resetTime };
      }

      const updated = await tx.rateLimit.update({
        where: { key: identifier },
        data: { count: { increment: 1 } },
      });

      return { count: updated.count, resetTime: existing.resetTime };
    });

    const resetIn = Math.max(0, result.resetTime.getTime() - Date.now());

    if (result.count > limit) {
      return { success: false, remaining: 0, resetIn };
    }

    return { success: true, remaining: limit - result.count, resetIn };
  } catch (error) {
    console.error('[RATE-LIMIT] DB Error:', error);
    return { success: true, remaining: 1, resetIn: windowMs };
  }
}

/**
 * The visitor's IP, for rate-limit keys.
 *
 * X-Forwarded-For is a list the client can start themselves: nginx's
 * `$proxy_add_x_forwarded_for` appends the real address to whatever the
 * client sent, so the raw header is attacker-controlled. Only entries added
 * by our own proxies are trustworthy, so count back from the right. With
 * nginx alone (TRUSTED_PROXY_COUNT=1, the default) the last entry is the
 * address nginx saw. Behind a second proxy such as Cloudflare, set it to 2.
 */
export function getClientIp(req: Request): string {
  const hops = Math.max(1, Number(process.env.TRUSTED_PROXY_COUNT) || 1);
  const chain = (req.headers.get('x-forwarded-for') ?? '')
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
  if (chain.length) return chain[Math.max(0, chain.length - hops)];
  return req.headers.get('x-real-ip')?.trim() || 'unknown';
}

export function getRateLimitHeaders(remaining: number, resetIn: number) {
  return {
    'X-RateLimit-Remaining': String(remaining),
    'Retry-After': String(Math.ceil(resetIn / 1000)),
  };
}
