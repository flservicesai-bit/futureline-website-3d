import { prisma } from './prisma';

export const normalizeEmail = (email: string) => email.trim().toLowerCase();

/**
 * Finds a user by email whatever its case. New addresses are stored
 * lower-case, but rows created before that rule may not be (run
 * `npm run normalize-emails` once to fix them).
 */
export function findUserByEmail(email: string) {
  return prisma.user.findFirst({
    where: { email: { equals: normalizeEmail(email), mode: 'insensitive' } },
    orderBy: { createdAt: 'asc' },
  });
}
