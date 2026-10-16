import { gateway } from '@ai-sdk/gateway';
import { BlobNotFoundError, head } from '@vercel/blob';
import { blobConfigured } from './blob';
import { MIN_SECRET_LENGTH } from './env';
import { secretStatus } from './secret';

// The setup page's checklist. The server checks what it can (deployment,
// AI Gateway, Blob, secret); the two last steps (testing the link and
// adding it to a chat app) are confirmed in the owner's browser.
//
// The secret comes after storage so one redeploy applies both, and the
// secret step shows the link at once (kept in that browser): owners who set
// the secret, redeployed and forgot it had to rotate it to get their link.

export type StepId = 'deploy' | 'secret' | 'gateway' | 'blob' | 'connect' | 'chat';
export type StepState = 'done' | 'todo';
/** An optional step never becomes "next", so it never holds up the steps after it. */
export type ServerStep = { id: StepId; title: string; state: StepState; detail: string; optional?: boolean };

const CACHE_MS = 60 * 1000;
let cache: { at: number; steps: ServerStep[] } | undefined;

const withTimeout = <T,>(promise: Promise<T>, ms: number) =>
  Promise.race([promise, new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timed out')), ms))]);

function checkDeploy(): ServerStep {
  const onVercel = Boolean(process.env.VERCEL);
  return {
    id: 'deploy',
    title: 'Deploy your copy',
    state: onVercel ? 'done' : 'todo',
    detail: onVercel
      ? 'This copy is running on your Vercel account.'
      : 'Running on your computer. Deploy to Vercel to use it from Claude or ChatGPT.',
  };
}

const SECRET_PROBLEM = {
  missing: 'A new copy starts without one',
  too_short: `Shorter than ${MIN_SECRET_LENGTH} characters`,
  weak: 'Too easy to guess (typed by hand or repeating). Make a new one below',
};

function checkSecret(): ServerStep {
  const status = secretStatus();
  return {
    id: 'secret',
    title: 'Set MCP_SECRET',
    state: status === 'ok' ? 'done' : 'todo',
    detail:
      status === 'ok'
        ? `Set and at least ${MIN_SECRET_LENGTH} characters long. The MCP endpoint is on.`
        : `${SECRET_PROBLEM[status]}, so your MCP endpoint is off. It takes three clicks.`,
  };
}

async function checkGateway(): Promise<ServerStep> {
  const step = { id: 'gateway' as const, title: 'Reach AI Gateway' };
  try {
    // Reading the team's credits is the cheapest call that proves the token works.
    await withTimeout(gateway.getCredits(), 8000);
    const via = process.env.AI_GATEWAY_API_KEY ? 'AI_GATEWAY_API_KEY' : 'the deployment’s OIDC token';
    return { ...step, state: 'done', detail: `Signed in with ${via}. No API key needed.` };
  } catch {
    return {
      ...step,
      state: 'todo',
      detail: process.env.VERCEL
        ? 'Could not sign in with the OIDC token. Check that AI Gateway is enabled for your team, then redeploy.'
        : 'Running outside Vercel. Run vercel link and vercel env pull (the token lasts 12 hours), or set AI_GATEWAY_API_KEY.',
    };
  }
}

async function checkBlob(): Promise<ServerStep> {
  // Required, as in Vercel's clone flow: video and every download link live in Blob.
  const step = { id: 'blob' as const, title: 'Connect file storage' };
  if (!blobConfigured()) {
    return {
      ...step,
      state: 'todo',
      detail: 'Video and every download link need it. Pictures and voice still show in chat without it.',
    };
  }
  try {
    await withTimeout(head('__status-check'), 8000);
  } catch (error) {
    if (!(error instanceof BlobNotFoundError)) {
      return { ...step, state: 'todo', detail: 'A Blob store is set up but could not be reached. Reconnect it to this project and redeploy.' };
    }
  }
  return { ...step, state: 'done', detail: 'A private Blob store holds your images and videos.' };
}

/** The server-checked steps, in order, plus placeholders for the two browser steps. Cached briefly. */
export async function getSetupSteps(): Promise<ServerStep[]> {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.steps;
  const [gatewayStep, blobStep] = await Promise.all([checkGateway(), checkBlob()]);
  const steps: ServerStep[] = [
    checkDeploy(),
    gatewayStep,
    blobStep,
    checkSecret(),
    {
      id: 'connect',
      title: 'Test your link',
      state: 'todo',
      detail: 'Checked by itself when this browser has your secret. From another browser, paste it once and test it.',
    },
    { id: 'chat', title: 'Add it to your chat app', state: 'todo', detail: 'Add the link as a connector in Claude, ChatGPT or another MCP app.' },
  ];
  cache = { at: Date.now(), steps };
  return steps;
}
