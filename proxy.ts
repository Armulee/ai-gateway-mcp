import { NextResponse, type NextRequest } from 'next/server';
import { matchesSecret } from '@/lib/secret';

// Rejects wrong secrets before routing, by rewriting to a path that does not
// exist. Next.js then renders its normal 404 page, so a wrong secret looks
// exactly like any unknown URL. The route handler checks the secret again.
// Never log request.url here: it contains the secret.
export function proxy(request: NextRequest) {
  const [, prefix, secret, ...rest] = request.nextUrl.pathname.split('/');
  if (prefix === 'mcp' && secret && rest.length === 0 && matchesSecret(safeDecode(secret))) {
    return NextResponse.next();
  }
  return NextResponse.rewrite(new URL('/__not-found', request.url));
}

function safeDecode(segment: string): string {
  try {
    return decodeURIComponent(segment);
  } catch {
    return '';
  }
}

export const config = {
  matcher: '/mcp/:path+',
};
