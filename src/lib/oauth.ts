/**
 * OAuth 2.1 for the Claude connector (MCP endpoint at /api/mcp).
 *
 * The site is both the authorization server and the protected resource:
 *   /.well-known/oauth-protected-resource   → which server issues tokens
 *   /.well-known/oauth-authorization-server → its endpoints
 *   /api/oauth/register   dynamic client registration (RFC 7591)
 *   /api/oauth/authorize  admin signs in and approves (PKCE S256 required)
 *   /api/oauth/token      code → tokens, refresh rotation
 *
 * Only active ADMIN accounts can approve or use a connection. Codes and
 * tokens are random 256-bit values stored only as SHA-256 hashes. A token
 * dies when it expires, is revoked in Admin → Settings, or the admin's
 * sessionVersion changes (password change or reset).
 */
import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { prisma } from '@/lib/prisma';

export const MCP_SCOPE = 'admin:read';
export const CODE_TTL_SECONDS = 5 * 60;
export const ACCESS_TTL_SECONDS = 60 * 60;
export const REFRESH_TTL_SECONDS = 30 * 24 * 60 * 60;

/** The site's public origin; the OAuth issuer. APP_URL in production, the request's origin otherwise. */
export function siteBase(req?: Request): string {
  const fromEnv = process.env.APP_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/+$/, '');
  if (req) return new URL(req.url).origin;
  return 'https://futureline.ai';
}
export const resourceUrl = (req?: Request) => `${siteBase(req)}/api/mcp`;
export const resourceMetadataUrl = (req?: Request) => `${siteBase(req)}/.well-known/oauth-protected-resource/api/mcp`;

export const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');
export const randomToken = (bytes = 32) => randomBytes(bytes).toString('base64url');

function safeEqual(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

/** PKCE S256: BASE64URL(SHA256(verifier)) must equal the challenge sent to /authorize. */
export function pkceMatches(verifier: string, challenge: string) {
  if (!/^[A-Za-z0-9\-._~]{43,128}$/.test(verifier)) return false;
  return safeEqual(createHash('sha256').update(verifier).digest('base64url'), challenge);
}

/**
 * Where Claude may send the admin back to. Registration accepts only these,
 * so a stranger cannot register a look-alike app that collects codes:
 * Claude (claude.ai / claude.com) and local clients such as Claude Code.
 */
export function redirectAllowed(uri: string): boolean {
  let u: URL;
  try {
    u = new URL(uri);
  } catch {
    return false;
  }
  if (u.hash || u.username || u.password) return false;
  if (u.protocol === 'https:' && ['claude.ai', 'claude.com', 'www.claude.ai', 'www.claude.com'].includes(u.hostname)) return true;
  if (u.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(u.hostname)) return true;
  const extra = (process.env.OAUTH_EXTRA_REDIRECT_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean);
  return extra.includes(u.origin);
}

// ── The consent form carries a signed, short-lived copy of the request, so the
//    POST can only approve exactly what the admin saw, as that admin. ─────────
type ConsentPayload = { u: string; c: string; r: string; cc: string; s: string; exp: number };

function consentKey() {
  const secret = process.env.NEXTAUTH_SECRET || process.env.SESSION_SECRET;
  if (!secret) throw new Error('NEXTAUTH_SECRET is not set');
  return createHmac('sha256', secret).update('futureline-oauth-consent').digest();
}

export function signConsent(p: Omit<ConsentPayload, 'exp'>, ttlSeconds = 10 * 60): string {
  const body = Buffer.from(JSON.stringify({ ...p, exp: Math.floor(Date.now() / 1000) + ttlSeconds })).toString('base64url');
  const sig = createHmac('sha256', consentKey()).update(body).digest('base64url');
  return `${body}.${sig}`;
}

export function verifyConsent(token: string): ConsentPayload | null {
  const [body, sig] = (token || '').split('.');
  if (!body || !sig) return null;
  const expected = createHmac('sha256', consentKey()).update(body).digest('base64url');
  if (!safeEqual(sig, expected)) return null;
  try {
    const p = JSON.parse(Buffer.from(body, 'base64url').toString()) as ConsentPayload;
    return p.exp > Math.floor(Date.now() / 1000) ? p : null;
  } catch {
    return null;
  }
}

/** The user behind a connection must still be an active admin. */
export async function activeAdmin(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, isActive: true, sessionVersion: true, firstName: true, lastName: true, email: true },
  });
  return user && user.isActive && user.role === 'ADMIN' ? user : null;
}

export async function issueTokens(input: { clientId: string; userId: string; scope: string; sessionVersion: number }) {
  const access = randomToken();
  const refresh = randomToken();
  const now = Date.now();
  await prisma.oAuthToken.create({
    data: {
      accessHash: sha256(access),
      refreshHash: sha256(refresh),
      clientId: input.clientId,
      userId: input.userId,
      scope: input.scope,
      sessionVersion: input.sessionVersion,
      expiresAt: new Date(now + ACCESS_TTL_SECONDS * 1000),
      refreshExpiresAt: new Date(now + REFRESH_TTL_SECONDS * 1000),
    },
  });
  return {
    access_token: access,
    token_type: 'Bearer',
    expires_in: ACCESS_TTL_SECONDS,
    refresh_token: refresh,
    scope: input.scope,
  };
}

/** Resolves the Bearer token on a request to its admin, or null. */
export async function authenticateBearer(req: Request) {
  const header = req.headers.get('authorization') || '';
  const m = /^Bearer\s+([A-Za-z0-9\-._~+/]+=*)$/i.exec(header.trim());
  if (!m) return { ok: false as const, presented: false };

  const token = await prisma.oAuthToken.findUnique({ where: { accessHash: sha256(m[1]) } });
  if (!token || token.revokedAt || token.expiresAt <= new Date()) return { ok: false as const, presented: true };

  const user = await activeAdmin(token.userId);
  if (!user || user.sessionVersion !== token.sessionVersion) return { ok: false as const, presented: true };

  // Remember when it was last used, at most once a minute.
  if (!token.lastUsedAt || Date.now() - token.lastUsedAt.getTime() > 60_000) {
    prisma.oAuthToken.update({ where: { id: token.id }, data: { lastUsedAt: new Date() } }).catch(() => {});
  }
  return { ok: true as const, token, user };
}

/** 401 that tells an MCP client where to find the authorization server. */
export function unauthorizedResponse(req: Request, presented: boolean) {
  const params = [`resource_metadata="${resourceMetadataUrl(req)}"`];
  if (presented) params.unshift('error="invalid_token"', 'error_description="The access token is invalid or expired"');
  return new Response(JSON.stringify({ error: presented ? 'invalid_token' : 'unauthorized' }), {
    status: 401,
    headers: { 'Content-Type': 'application/json', 'WWW-Authenticate': `Bearer ${params.join(', ')}`, ...corsHeaders },
  });
}

/** Tokens are bearer credentials, not cookies, so cross-origin calls carry no ambient authority. */
export const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type, Mcp-Protocol-Version, Mcp-Session-Id, Last-Event-ID',
  'Access-Control-Expose-Headers': 'WWW-Authenticate, Mcp-Session-Id',
  'Access-Control-Max-Age': '86400',
};

export function oauthError(error: string, description: string, status = 400) {
  return new Response(JSON.stringify({ error, error_description: description }), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...corsHeaders },
  });
}

export function jsonNoStore(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', Pragma: 'no-cache', ...corsHeaders },
  });
}
