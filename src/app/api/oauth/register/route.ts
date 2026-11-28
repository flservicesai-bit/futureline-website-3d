import { prisma } from '@/lib/prisma';
import { getClientIp, rateLimit } from '@/lib/rateLimit';
import { corsHeaders, jsonNoStore, oauthError, randomToken, redirectAllowed, sha256 } from '@/lib/oauth';

/**
 * Dynamic client registration (RFC 7591). Claude registers itself here the
 * first time the connector is added. Registering grants nothing: an admin
 * still has to sign in and approve, and only Claude's own callback URLs
 * (or a local one) are accepted as redirect targets.
 */
export async function POST(req: Request) {
  const rl = await rateLimit(`oauth-register:${getClientIp(req)}`, 20, 60 * 60 * 1000);
  if (!rl.success) return oauthError('too_many_requests', 'Too many registrations, try again later', 429);

  let body: any;
  try {
    body = await req.json();
  } catch {
    return oauthError('invalid_client_metadata', 'Body must be JSON');
  }

  const redirectUris: unknown = body?.redirect_uris;
  if (!Array.isArray(redirectUris) || redirectUris.length === 0 || redirectUris.length > 10 || !redirectUris.every((u) => typeof u === 'string')) {
    return oauthError('invalid_redirect_uri', 'redirect_uris must be a non-empty list of URLs');
  }
  const bad = (redirectUris as string[]).find((u) => !redirectAllowed(u));
  if (bad) return oauthError('invalid_redirect_uri', `Redirect URI not allowed: ${bad.slice(0, 200)}`);

  const method = typeof body.token_endpoint_auth_method === 'string' ? body.token_endpoint_auth_method : 'none';
  if (!['none', 'client_secret_post', 'client_secret_basic'].includes(method)) {
    return oauthError('invalid_client_metadata', `Unsupported token_endpoint_auth_method: ${method}`);
  }
  const name = (typeof body.client_name === 'string' && body.client_name.trim()) || 'Unnamed client';

  const clientId = `fl_${randomToken(18)}`;
  const secret = method === 'none' ? null : randomToken(32);
  await prisma.oAuthClient.create({
    data: {
      clientId,
      secretHash: secret ? sha256(secret) : null,
      authMethod: method,
      name: name.slice(0, 100),
      redirectUris: redirectUris as string[],
    },
  });

  return jsonNoStore(
    {
      client_id: clientId,
      ...(secret ? { client_secret: secret, client_secret_expires_at: 0 } : {}),
      client_id_issued_at: Math.floor(Date.now() / 1000),
      client_name: name.slice(0, 100),
      redirect_uris: redirectUris,
      token_endpoint_auth_method: method,
      grant_types: ['authorization_code', 'refresh_token'],
      response_types: ['code'],
    },
    201,
  );
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders });
}
