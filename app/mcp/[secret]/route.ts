import { notFound } from 'next/navigation';
import { instanceContext } from '@/lib/gateway';
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
  return handler(request);
}

export { handle as DELETE, handle as GET, handle as POST };
