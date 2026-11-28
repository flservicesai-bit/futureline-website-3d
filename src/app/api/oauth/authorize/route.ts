import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import {
  CODE_TTL_SECONDS,
  MCP_SCOPE,
  randomToken,
  resourceUrl,
  sha256,
  signConsent,
  siteBase,
  verifyConsent,
} from '@/lib/oauth';

/**
 * Authorization endpoint. GET shows the signed-in admin what is asking for
 * access; POST records their decision and sends them back to the client with
 * a one-time code. Signed-out visitors go through the normal login first.
 */

const esc = (v: unknown) =>
  String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

function page(title: string, inner: string, status = 200) {
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex"><title>${esc(title)} · FutureLine</title>
<style>
  :root{color-scheme:light}
  body{margin:0;min-height:100vh;display:grid;place-items:center;background:#f4efe6;font:16px/1.55 system-ui,-apple-system,"Segoe UI",sans-serif;color:#0f1b33}
  .card{width:min(460px,calc(100vw - 32px));background:#fff;border:1px solid #e4dccd;border-radius:16px;padding:28px 28px 24px;box-shadow:0 18px 50px rgba(1,28,65,.10)}
  .brand{font-weight:800;letter-spacing:-.3px;color:#011c41;font-size:15px;margin-bottom:18px}
  h1{font-size:21px;line-height:1.3;margin:0 0 10px;color:#011c41}
  p{margin:0 0 12px;color:#44506a}
  ul{margin:4px 0 16px;padding-left:20px;color:#44506a} li{margin:3px 0}
  .who{background:#f7f4ee;border:1px solid #ece4d6;border-radius:10px;padding:10px 12px;font-size:14px;margin:12px 0 16px;word-break:break-all}
  .row{display:flex;gap:10px;margin-top:20px}
  button{flex:1;border-radius:10px;padding:12px 14px;font:600 15px system-ui;cursor:pointer;border:1px solid #011c41}
  .yes{background:#011c41;color:#fff} .no{background:#fff;color:#011c41}
  .note{font-size:13px;color:#6b7590;margin-top:16px}
</style></head><body><main class="card"><div class="brand">FutureLine</div>${inner}</main></body></html>`;
  return new Response(html, {
    status,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
      // The approval page must never be framed (clickjacking).
      'X-Frame-Options': 'DENY',
      // No form-action here: Chrome applies it to the redirect after submit,
      // which would block the hop back to Claude.
      'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; frame-ancestors 'none'; base-uri 'none'",
      'Referrer-Policy': 'no-referrer',
    },
  });
}

function backTo(redirectUri: string, params: Record<string, string | undefined>, req: Request) {
  const url = new URL(redirectUri);
  for (const [k, v] of Object.entries(params)) if (v) url.searchParams.set(k, v);
  url.searchParams.set('iss', siteBase(req));
  return Response.redirect(url.toString(), 303);
}

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams;
  const clientId = q.get('client_id') || '';
  const redirectUri = q.get('redirect_uri') || '';
  const state = q.get('state') || undefined;

  // Until the client and its redirect are known-good, never redirect anywhere.
  const client = clientId ? await prisma.oAuthClient.findUnique({ where: { clientId } }) : null;
  if (!client || !client.redirectUris.includes(redirectUri)) {
    return page('Invalid request', '<h1>This connection request is not valid</h1><p>The app that sent you here is not registered, or its return address does not match. Start the connection again from Claude.</p>', 400);
  }
  if (q.get('response_type') !== 'code') return backTo(redirectUri, { error: 'unsupported_response_type', state }, req);
  const challenge = q.get('code_challenge') || '';
  if (q.get('code_challenge_method') !== 'S256' || !/^[A-Za-z0-9\-_]{43}$/.test(challenge)) {
    return backTo(redirectUri, { error: 'invalid_request', error_description: 'PKCE with S256 is required', state }, req);
  }
  const resource = q.get('resource');
  if (resource && resource.replace(/\/+$/, '') !== resourceUrl(req)) {
    return backTo(redirectUri, { error: 'invalid_target', state }, req);
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    const here = new URL(req.url);
    const callbackUrl = `${here.pathname}${here.search}`;
    return Response.redirect(`${siteBase(req)}/en/login?callbackUrl=${encodeURIComponent(callbackUrl)}`, 303);
  }
  if (session.user.role !== 'ADMIN') {
    return page('Admins only', '<h1>Only FutureLine admins can connect Claude</h1><p>You are signed in with an account that is not an admin. Sign in with the admin account and try again.</p>', 403);
  }

  const consent = signConsent({ u: session.user.id, c: client.clientId, r: redirectUri, cc: challenge, s: state || '' });
  const host = new URL(redirectUri).host;
  return page(
    'Connect to FutureLine',
    `<h1>Allow ${esc(client.name)} to read your FutureLine admin data?</h1>
<div class="who">Signed in as <b>${esc(session.user.email)}</b><br>Returns to <b>${esc(host)}</b></div>
<p>It will be able to <b>read</b>:</p>
<ul><li>Clients and their orders, enrolments and progress</li><li>Leads, their activity and notes</li><li>Orders, payments and revenue</li><li>Course statistics</li><li>The log of emails the site sends</li></ul>
<p>It cannot change anything on the site.</p>
<form method="post" action="/api/oauth/authorize">
<input type="hidden" name="consent" value="${esc(consent)}">
<div class="row"><button class="no" name="decision" value="deny">Cancel</button><button class="yes" name="decision" value="approve">Allow</button></div>
</form>
<p class="note">You can disconnect it at any time in Admin → Settings. Changing your password disconnects it too.</p>`,
  );
}

export async function POST(req: Request) {
  const form = await req.formData();
  const consent = verifyConsent(String(form.get('consent') || ''));
  if (!consent) {
    return page('Expired', '<h1>This approval has expired</h1><p>Start the connection again from Claude.</p>', 400);
  }

  // Same admin who saw the page, still signed in and still an admin.
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.id !== consent.u || session.user.role !== 'ADMIN') {
    return page('Not allowed', '<h1>Sign in as the admin who started this connection</h1>', 403);
  }
  const client = await prisma.oAuthClient.findUnique({ where: { clientId: consent.c } });
  if (!client || !client.redirectUris.includes(consent.r)) {
    return page('Invalid request', '<h1>This connection request is not valid</h1>', 400);
  }

  if (form.get('decision') !== 'approve') {
    return backTo(consent.r, { error: 'access_denied', state: consent.s || undefined }, req);
  }

  const code = randomToken();
  await prisma.oAuthCode.create({
    data: {
      codeHash: sha256(code),
      clientId: client.clientId,
      userId: consent.u,
      redirectUri: consent.r,
      codeChallenge: consent.cc,
      scope: MCP_SCOPE,
      expiresAt: new Date(Date.now() + CODE_TTL_SECONDS * 1000),
    },
  });
  console.log(`[OAuth] ${session.user.email} approved "${client.name}" (${client.clientId})`);
  return backTo(consent.r, { code, state: consent.s || undefined }, req);
}
