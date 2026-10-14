import { gateway } from '@ai-sdk/gateway';
import { BlobNotFoundError, head } from '@vercel/blob';
import { blobConfigured } from './blob';
import { MIN_SECRET_LENGTH } from './env';
import { secretStatus } from './secret';

export type Check = { label: string; ok: boolean; detail: string };

const CACHE_MS = 60 * 1000;
let cache: { at: number; checks: Check[] } | undefined;

const withTimeout = <T,>(promise: Promise<T>, ms: number) =>
  Promise.race([promise, new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timed out')), ms))]);

async function checkGateway(): Promise<Check> {
  const label = 'AI Gateway reachable';
  try {
    // Needs a valid credential (OIDC on Vercel). The balance itself is never shown.
    await withTimeout(gateway.getCredits(), 8000);
    const via = process.env.AI_GATEWAY_API_KEY ? 'AI_GATEWAY_API_KEY' : 'the deployment OIDC token';
    return { label, ok: true, detail: `Authenticated with ${via}.` };
  } catch {
    return {
      label,
      ok: false,
      detail: process.env.VERCEL
        ? 'Could not authenticate with the OIDC token. Check that AI Gateway is enabled for this team, then redeploy.'
        : 'Running outside Vercel. Run vercel link, then vercel env pull (the OIDC token lasts 12 hours), or set AI_GATEWAY_API_KEY.',
    };
  }
}

async function checkBlob(): Promise<Check> {
  const label = 'Blob store connected';
  if (!blobConfigured()) {
    return {
      label,
      ok: false,
      detail: 'No Blob store found. In your Vercel project open Storage, create a private Blob store, connect it, then redeploy. Video and image download links need it.',
    };
  }
  try {
    await withTimeout(head('__status-check'), 8000);
    return { label, ok: true, detail: 'Private store reachable.' };
  } catch (error) {
    if (error instanceof BlobNotFoundError) return { label, ok: true, detail: 'Private store reachable.' };
    return { label, ok: false, detail: 'A Blob store is configured but could not be reached. Reconnect it to this project and redeploy.' };
  }
}

function checkSecret(): Check {
  const label = 'MCP_SECRET set';
  const status = secretStatus();
  if (status === 'ok') return { label, ok: true, detail: `Set and at least ${MIN_SECRET_LENGTH} characters. The MCP endpoint is enabled.` };
  return {
    label,
    ok: false,
    detail:
      (status === 'missing' ? 'MCP_SECRET is not set.' : `MCP_SECRET is shorter than ${MIN_SECRET_LENGTH} characters.`) +
      ' The MCP endpoint is disabled. Set a long random value in Project Settings → Environment Variables and redeploy.',
  };
}

/** Pass/fail checks for the setup page, cached briefly so page views stay cheap. */
export async function getStatusChecks(): Promise<Check[]> {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.checks;
  const checks = [await checkGateway(), await checkBlob(), checkSecret()];
  cache = { at: Date.now(), checks };
  return checks;
}
