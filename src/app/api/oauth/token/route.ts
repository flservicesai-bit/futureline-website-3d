import { createHash, timingSafeEqual } from 'node:crypto';
import { prisma } from '@/lib/prisma';
import { getClientIp, rateLimit } from '@/lib/rateLimit';
import {
  activeAdmin,
  corsHeaders,
  issueTokens,
  jsonNoStore,
  MCP_SCOPE,
  oauthError,
  pkceMatches,
  resourceUrl,
  sha256,
} from '@/lib/oauth';

async function readParams(req: Request): Promise<URLSearchParams> {
  const type = req.headers.get('content-type') || '';
  if (type.includes('application/json')) {
    const body = await req.json().catch(() => ({}));
    return new URLSearchParams(Object.entries(body ?? {}).map(([k, v]) => [k, String(v)]));
  }
  return new URLSearchParams(await req.text());
}

function sameHash(secret: string, hash: string) {
  const a = Buffer.from(createHash('sha256').update(secret).digest('hex'));
  const b = Buffer.from(hash);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Token endpoint: authorization_code (with PKCE) and refresh_token (rotating). */
export async function POST(req: Request) {
  const rl = await rateLimit(`oauth-token:${getClientIp(req)}`, 60, 60 * 1000);
  if (!rl.success) return oauthError('too_many_requests', 'Slow down', 429);

  const p = await readParams(req);

  // Client authentication: HTTP Basic, a client_secret in the body, or none for public clients.
  let clientId = p.get('client_id') || '';
  let clientSecret = p.get('client_secret') || '';
  const basic = /^Basic\s+(.+)$/i.exec(req.headers.get('authorization') || '');
  if (basic) {
    const [id, secret] = Buffer.from(basic[1], 'base64').toString().split(':');
    clientId = decodeURIComponent(id || '');
    clientSecret = decodeURIComponent(secret || '');
  }
  const client = clientId ? await prisma.oAuthClient.findUnique({ where: { clientId } }) : null;
  if (!client) return oauthError('invalid_client', 'Unknown client', 401);
  if (client.secretHash && !(clientSecret && sameHash(clientSecret, client.secretHash))) {
    return oauthError('invalid_client', 'Client authentication failed', 401);
  }

  const resource = p.get('resource');
  if (resource && resource.replace(/\/+$/, '') !== resourceUrl(req)) {
    return oauthError('invalid_target', 'Unknown resource');
  }

  const grant = p.get('grant_type');

  if (grant === 'authorization_code') {
    const code = p.get('code') || '';
    const verifier = p.get('code_verifier') || '';
    const redirectUri = p.get('redirect_uri') || '';
    const row = code ? await prisma.oAuthCode.findUnique({ where: { codeHash: sha256(code) } }) : null;
    if (!row || row.clientId !== client.clientId || row.usedAt || row.expiresAt <= new Date()) {
      return oauthError('invalid_grant', 'Code is invalid, used or expired');
    }
    if (row.redirectUri !== redirectUri) return oauthError('invalid_grant', 'redirect_uri does not match');
    if (!pkceMatches(verifier, row.codeChallenge)) return oauthError('invalid_grant', 'PKCE verification failed');

    // One use only, even under concurrent requests.
    const { count } = await prisma.oAuthCode.updateMany({ where: { id: row.id, usedAt: null }, data: { usedAt: new Date() } });
    if (count === 0) return oauthError('invalid_grant', 'Code already used');

    const admin = await activeAdmin(row.userId);
    if (!admin) return oauthError('invalid_grant', 'The approving account is no longer an active admin');
    return jsonNoStore(await issueTokens({ clientId: client.clientId, userId: admin.id, scope: row.scope, sessionVersion: admin.sessionVersion }));
  }

  if (grant === 'refresh_token') {
    const refresh = p.get('refresh_token') || '';
    const row = refresh ? await prisma.oAuthToken.findUnique({ where: { refreshHash: sha256(refresh) } }) : null;
    if (!row || row.clientId !== client.clientId || row.revokedAt || !row.refreshExpiresAt || row.refreshExpiresAt <= new Date()) {
      return oauthError('invalid_grant', 'Refresh token is invalid, revoked or expired');
    }
    const admin = await activeAdmin(row.userId);
    if (!admin || admin.sessionVersion !== row.sessionVersion) {
      return oauthError('invalid_grant', 'Access was withdrawn: sign in and approve again');
    }
    // Rotation: the old pair stops working the moment a new one is issued.
    const { count } = await prisma.oAuthToken.updateMany({ where: { id: row.id, revokedAt: null }, data: { revokedAt: new Date() } });
    if (count === 0) return oauthError('invalid_grant', 'Refresh token already used');
    return jsonNoStore(await issueTokens({ clientId: client.clientId, userId: admin.id, scope: row.scope || MCP_SCOPE, sessionVersion: admin.sessionVersion }));
  }

  return oauthError('unsupported_grant_type', 'Use authorization_code or refresh_token');
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders });
}
