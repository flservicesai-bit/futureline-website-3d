import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import { authenticateBearer, corsHeaders, unauthorizedResponse } from '@/lib/oauth';
import { rateLimit } from '@/lib/rateLimit';
import { registerAdminTools } from '@/lib/mcp/admin-tools';

/**
 * The Claude connector: a read-only MCP server over Streamable HTTP.
 * Add https://futureline.ai/api/mcp as a custom connector in Claude; it signs
 * in through /api/oauth (lib/oauth.ts). Stateless: every POST builds a fresh
 * server, answers with JSON, and closes. See docs/CLAUDE-CONNECTOR.md.
 */
export const dynamic = 'force-dynamic';

const INSTRUCTIONS = `FutureLine (futureline.ai) is an Omani company that sells online courses and AI/software services.
These tools read the live admin data: users (clients), leads (the sales pipeline), orders and payments, course enrolments and progress, and the log of emails the site sends.
All tools are read-only. Amounts are in Omani rials (OMR, 3 decimals). Times are UTC; Oman is UTC+4.
Start with get_overview for "how are we doing" questions; use search_people then get_client or get_lead to look someone up.`;

async function handle(req: Request) {
  const auth = await authenticateBearer(req);
  if (!auth.ok) return unauthorizedResponse(req, auth.presented);

  const rl = await rateLimit(`mcp:${auth.token.id}`, 120, 60 * 1000);
  if (!rl.success) {
    return new Response(JSON.stringify({ error: 'rate_limited' }), {
      status: 429,
      headers: { 'Content-Type': 'application/json', 'Retry-After': String(Math.ceil(rl.resetIn / 1000)), ...corsHeaders },
    });
  }

  const server = new McpServer({ name: 'futureline-admin', version: '1.0.0' }, { instructions: INSTRUCTIONS });
  registerAdminTools(server, { userId: auth.user.id, clientId: auth.token.clientId });
  const transport = new WebStandardStreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
  await server.connect(transport);
  try {
    const res = await transport.handleRequest(req);
    const headers = new Headers(res.headers);
    for (const [k, v] of Object.entries(corsHeaders)) headers.set(k, v);
    return new Response(res.body, { status: res.status, headers });
  } finally {
    // JSON mode has finished writing by now; release the per-request server.
    server.close().catch(() => {});
  }
}

export const POST = handle;

/** No server-initiated stream in stateless mode; the spec allows 405 here. */
export async function GET(req: Request) {
  const auth = await authenticateBearer(req);
  if (!auth.ok) return unauthorizedResponse(req, auth.presented);
  return new Response(null, { status: 405, headers: { Allow: 'POST', ...corsHeaders } });
}

export async function DELETE() {
  return new Response(null, { status: 405, headers: { Allow: 'POST', ...corsHeaders } });
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders });
}
