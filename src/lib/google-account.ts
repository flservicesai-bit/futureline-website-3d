import bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import { prisma } from './prisma';
import { findUserByEmail, normalizeEmail } from './user-email';
import { notifyGoogleTookOver, notifyWelcome } from './notifications';

const randomPasswordHash = () => bcrypt.hash(randomBytes(24).toString('hex'), 12);

/**
 * Persists a Google sign-in to the User table and decides whether it may
 * proceed. There is no NextAuth adapter (jwt strategy), so the session must be
 * tied to a real User row.
 *
 * Google confirms the person owns the address, so:
 * - an unconfirmed Google address is refused;
 * - no account yet: one is created, already verified;
 * - an existing account whose owner has proved the address: linked as is;
 * - an existing account nobody has verified: Google's proof wins. Anyone can
 *   register someone else's email with a password of their choosing, so the
 *   password is replaced and every session revoked before the real owner is
 *   let in. Otherwise the person who pre-registered keeps access.
 */
export async function linkGoogleAccount(input: {
  email: string | null | undefined;
  name?: string | null;
  image?: string | null;
  emailVerifiedByGoogle: boolean;
}): Promise<boolean> {
  if (!input.email || !input.emailVerifiedByGoogle) return false;
  const email = normalizeEmail(input.email);
  const existing = await findUserByEmail(email);

  if (existing && !existing.isActive) return false; // deactivated account

  if (!existing) {
    const nameParts = (input.name ?? '').trim().split(/\s+/).filter(Boolean);
    // Random password: Google users authenticate via OAuth, never with a
    // password, but the column is required and credentials login must fail.
    await prisma.user.create({
      data: {
        email,
        firstName: nameParts[0] ?? '',
        lastName: nameParts.slice(1).join(' '),
        image: input.image ?? null,
        password: await randomPasswordHash(),
        role: 'CUSTOMER',
        emailVerified: new Date(),
      },
    });
    // Fire-and-forget so a mail failure can't block login.
    notifyWelcome({
      name: `${nameParts[0] ?? ''} ${nameParts.slice(1).join(' ')}`.trim() || 'there',
      email,
    }).catch((err) => console.error('[AUTH] Welcome email failed:', err));
    return true;
  }

  if (!existing.emailVerified) {
    await prisma.user.update({
      where: { id: existing.id },
      data: {
        password: await randomPasswordHash(),
        sessionVersion: { increment: 1 },
        emailVerified: new Date(),
        resetToken: null,
        resetTokenExpiry: null,
        verifyToken: null,
        verifyExpiry: null,
      },
    });
    console.info(`[AUTH] Google sign-in took over unverified account ${existing.id}`);
    // Tell the owner why their password stopped working.
    notifyGoogleTookOver({
      name: `${existing.firstName} ${existing.lastName}`.trim() || 'there',
      email,
    }).catch((err) => console.error('[AUTH] Takeover email failed:', err));
  }
  return true;
}
