import crypto from 'crypto';
import { prisma } from './prisma';

const TOKEN_TTL_MS = 24 * 60 * 60 * 1000;
const hash = (token: string) => crypto.createHash('sha256').update(token).digest('hex');

/** Creates a single-use verification token (stored hashed) and returns the raw one for the link. */
export async function issueVerifyToken(userId: string): Promise<string> {
  const raw = crypto.randomBytes(32).toString('hex');
  await prisma.user.update({
    where: { id: userId },
    data: { verifyToken: hash(raw), verifyExpiry: new Date(Date.now() + TOKEN_TTL_MS) },
  });
  return raw;
}

/** Marks the token's owner as verified. False when the token is unknown, used or expired. */
export async function consumeVerifyToken(raw: string): Promise<boolean> {
  const user = await prisma.user.findFirst({
    where: { verifyToken: hash(raw), verifyExpiry: { gt: new Date() } },
    select: { id: true },
  });
  if (!user) return false;
  await prisma.user.update({
    where: { id: user.id },
    data: { emailVerified: new Date(), verifyToken: null, verifyExpiry: null },
  });
  return true;
}
