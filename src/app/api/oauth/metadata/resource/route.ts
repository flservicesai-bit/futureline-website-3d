import { corsHeaders, MCP_SCOPE, resourceUrl, siteBase } from '@/lib/oauth';

/** RFC 9728 protected resource metadata, served at /.well-known/oauth-protected-resource[/api/mcp]. */
export function GET(req: Request) {
  return Response.json(
    {
      resource: resourceUrl(req),
      authorization_servers: [siteBase(req)],
      scopes_supported: [MCP_SCOPE],
      bearer_methods_supported: ['header'],
      resource_name: 'FutureLine admin',
    },
    { headers: { 'Cache-Control': 'public, max-age=3600', ...corsHeaders } },
  );
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders });
}
