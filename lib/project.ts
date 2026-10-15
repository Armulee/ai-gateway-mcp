import { headers } from 'next/headers';
import type { VercelProject } from './site';

// Which Vercel team and project this deployment belongs to, read from its OIDC
// token, whose claims carry the team slug (`owner`) and project name
// (`project`). On Vercel the token arrives per request in the
// x-vercel-oidc-token header; locally `vercel env pull` puts it in
// VERCEL_OIDC_TOKEN. It only builds dashboard links, so it is decoded, not verified.

export async function getVercelProject(): Promise<VercelProject | undefined> {
  const token = (await headers()).get('x-vercel-oidc-token') ?? process.env.VERCEL_OIDC_TOKEN;
  const payload = token?.split('.')[1];
  if (!payload) return undefined;
  try {
    const claims = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (typeof claims.owner === 'string' && typeof claims.project === 'string') return { owner: claims.owner, name: claims.project };
  } catch {
    // Not a JWT: fall back to the "/d?to=" links.
  }
  return undefined;
}
