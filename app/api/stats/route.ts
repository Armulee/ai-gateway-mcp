import { getStats } from '@/lib/stats';
import { matchesSecret } from '@/lib/secret';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// The owner's usage, for the setup page. The secret travels in the body (never
// the URL, which ends up in logs) and is compared in constant time. A wrong
// secret gets the same plain 404 as any unknown route. Never log the body.
export async function POST(request: Request) {
  let secret = '';
  try {
    const body = (await request.json()) as { secret?: unknown };
    if (typeof body.secret === 'string') secret = body.secret;
  } catch {
    // Not JSON: treated like a wrong secret.
  }
  if (!matchesSecret(secret)) return new Response('Not Found', { status: 404 });
  return Response.json(await getStats(), { headers: { 'cache-control': 'no-store' } });
}

// Any other way of asking looks like a route that does not exist.
export function GET() {
  return new Response('Not Found', { status: 404 });
}
