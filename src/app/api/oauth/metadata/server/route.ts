import { corsHeaders, MCP_SCOPE, siteBase } from '@/lib/oauth';

/** RFC 8414 authorization server metadata, served at /.well-known/oauth-authorization-server. */
export function GET(req: Request) {
  const base = siteBase(req);
  return Response.json(
    {
      issuer: base,
      authorization_endpoint: `${base}/api/oauth/authorize`,
      token_endpoint: `${base}/api/oauth/token`,
      registration_endpoint: `${base}/api/oauth/register`,
      response_types_supported: ['code'],
      grant_types_supported: ['authorization_code', 'refresh_token'],
      code_challenge_methods_supported: ['S256'],
      token_endpoint_auth_methods_supported: ['none', 'client_secret_post', 'client_secret_basic'],
      scopes_supported: [MCP_SCOPE],
      authorization_response_iss_parameter_supported: true,
    },
    { headers: { 'Cache-Control': 'public, max-age=3600', ...corsHeaders } },
  );
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders });
}
