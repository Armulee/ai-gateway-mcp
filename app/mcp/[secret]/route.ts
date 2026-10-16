import { notFound } from 'next/navigation';
import { clientFromUserAgent, instanceContext, withRequest } from '@/lib/gateway';
import { createGatewayMcpHandler } from '@/lib/mcp';
import { matchesSecret } from '@/lib/secret';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
// Long enough to download a finished video and copy it into Blob.
export const maxDuration = 300;

const handler = createGatewayMcpHandler(instanceContext);

type Params = { params: Promise<{ secret: string }> };

// A wrong, missing or too-short MCP_SECRET answers exactly like an unknown
// route. Never log the request URL here: it contains the secret.
async function handle(request: Request, { params }: Params) {
  const { secret } = await params;
  if (!matchesSecret(secret)) notFound();
  // Remember which chat app is calling (its spend shows on the setup page) and
  // the connector URL, which names the media view's sandbox domain in Claude.
  const { origin, pathname } = new URL(request.url);
  return withRequest({ client: clientFromUserAgent(request.headers.get('user-agent')), connectorUrl: `${origin}${pathname}` }, () => handler(request));
}

export { handle as DELETE, handle as GET, handle as POST };
