/**
 * One-off: lower-cases stored User emails (run once after deploying the
 * case-insensitive email change).
 *
 *   npm run normalize-emails            # report only
 *   npm run normalize-emails -- --apply # make the changes
 *
 * Accounts whose emails differ only by case (Jane@x.com and jane@x.com) are
 * two real accounts that may each hold orders or enrolments, so they are
 * listed for an admin to merge by hand and never changed here.
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const apply = process.argv.includes('--apply');

async function main() {
  const users = await prisma.user.findMany({ select: { id: true, email: true, createdAt: true } });
  const byLower = new Map<string, typeof users>();
  for (const u of users) {
    const key = u.email.trim().toLowerCase();
    byLower.set(key, [...(byLower.get(key) ?? []), u]);
  }

  let changed = 0;
  for (const [lower, group] of byLower) {
    if (group.length > 1) {
      console.log(`DUPLICATE (merge by hand): ${group.map((u) => `${u.email} [${u.id}]`).join(', ')}`);
      continue;
    }
    const [u] = group;
    if (u.email === lower) continue;
    console.log(`${apply ? 'Updating' : 'Would update'}: ${u.email} -> ${lower}`);
    if (apply) await prisma.user.update({ where: { id: u.id }, data: { email: lower } });
    changed++;
  }
  console.log(`${changed} email(s) ${apply ? 'updated' : 'to update'}${apply ? '' : ' (dry run; add --apply)'}.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
