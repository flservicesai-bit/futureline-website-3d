import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * Claude connector connections (OAuth clients with live tokens), for the
 * admin settings page. GET lists them; DELETE ?clientId= revokes one.
 */
async function requireAdmin() {
  const session = await getServerSession(authOptions);
  return session?.user?.role === 'ADMIN' ? session : null;
}

export async function GET() {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const now = new Date();
  const tokens = await prisma.oAuthToken.findMany({
    where: { revokedAt: null, OR: [{ expiresAt: { gt: now } }, { refreshExpiresAt: { gt: now } }] },
    select: {
      clientId: true, userId: true, createdAt: true, lastUsedAt: true, refreshExpiresAt: true,
      client: { select: { name: true, redirectUris: true, createdAt: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
  const users = await prisma.user.findMany({
    where: { id: { in: [...new Set(tokens.map((t) => t.userId))] } },
    select: { id: true, email: true },
  });
  const emailOf = new Map(users.map((u) => [u.id, u.email]));

  // One row per client: newest grant, most recent use.
  const byClient = new Map<string, any>();
  for (const t of tokens) {
    const row = byClient.get(t.clientId);
    const lastUsed = t.lastUsedAt?.getTime() ?? 0;
    if (!row) {
      byClient.set(t.clientId, {
        clientId: t.clientId,
        name: t.client.name,
        returnsTo: (() => { try { return new URL(t.client.redirectUris[0]).host; } catch { return ''; } })(),
        approvedBy: emailOf.get(t.userId) ?? null,
        connectedAt: t.client.createdAt,
        lastUsedAt: t.lastUsedAt,
        expiresAt: t.refreshExpiresAt,
      });
    } else if (lastUsed > (row.lastUsedAt ? new Date(row.lastUsedAt).getTime() : 0)) {
      row.lastUsedAt = t.lastUsedAt;
    }
  }
  return NextResponse.json([...byClient.values()]);
}

export async function DELETE(req: Request) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const clientId = new URL(req.url).searchParams.get('clientId');
  if (!clientId) return NextResponse.json({ error: 'clientId is required' }, { status: 400 });

  const [{ count }] = await prisma.$transaction([
    prisma.oAuthToken.updateMany({ where: { clientId, revokedAt: null }, data: { revokedAt: new Date() } }),
    prisma.oAuthCode.deleteMany({ where: { clientId, usedAt: null } }),
  ]);
  console.log(`[OAuth] ${session.user.email} revoked ${clientId} (${count} token(s))`);
  return NextResponse.json({ revoked: count });
}
