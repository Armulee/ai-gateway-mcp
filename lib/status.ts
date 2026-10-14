import { gateway } from '@ai-sdk/gateway';
import { BlobNotFoundError, head } from '@vercel/blob';
import { blobConfigured } from './blob';
import { MIN_SECRET_LENGTH } from './env';
import { secretStatus } from './secret';

// The setup page's checklist. The server checks what it can (deployment,
// secret, AI Gateway, Blob, credits); the two last steps (testing the link and
// adding it to a chat app) are confirmed in the owner's browser.

export type StepId = 'deploy' | 'secret' | 'gateway' | 'blob' | 'credits' | 'connect' | 'chat';
export type StepState = 'done' | 'todo';
export type ServerStep = { id: StepId; title: string; state: StepState; detail: string };

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

function checkSecret(): ServerStep {
  const status = secretStatus();
  return {
    id: 'secret',
    title: 'Set MCP_SECRET',
    state: status === 'ok' ? 'done' : 'todo',
    detail:
      status === 'ok'
        ? `Set and at least ${MIN_SECRET_LENGTH} characters long. The MCP endpoint is on.`
        : `${status === 'missing' ? 'MCP_SECRET is not set' : `MCP_SECRET is shorter than ${MIN_SECRET_LENGTH} characters`}, so the MCP endpoint is off. Add a long random value in Project Settings → Environment Variables, then redeploy.`,
  };
}

async function checkGatewayAndCredits(): Promise<[ServerStep, ServerStep]> {
  try {
    const credits = await withTimeout(gateway.getCredits(), 8000);
    const via = process.env.AI_GATEWAY_API_KEY ? 'AI_GATEWAY_API_KEY' : 'the deployment’s OIDC token';
    // The balance itself is shown only after the owner unlocks usage with the secret.
    const hasCredits = Number(credits.balance) > 0;
    return [
      { id: 'gateway', title: 'Reach AI Gateway', state: 'done', detail: `Signed in with ${via}. No API key needed.` },
      {
        id: 'credits',
        title: 'Add credits and a budget',
        state: hasCredits ? 'done' : 'todo',
        detail: hasCredits
          ? 'Your team has AI Gateway credits. Set a spend budget too: it is the real limit on what this link can spend.'
          : 'No paid credits yet. Free monthly credits cover a set of models; top up for the rest, and set a spend budget.',
      },
    ];
  } catch {
    return [
      {
        id: 'gateway',
        title: 'Reach AI Gateway',
        state: 'todo',
        detail: process.env.VERCEL
          ? 'Could not sign in with the OIDC token. Check that AI Gateway is enabled for your team, then redeploy.'
          : 'Running outside Vercel. Run vercel link and vercel env pull (the token lasts 12 hours), or set AI_GATEWAY_API_KEY.',
      },
      { id: 'credits', title: 'Add credits and a budget', state: 'todo', detail: 'Checked once AI Gateway is reachable.' },
    ];
  }
}

async function checkBlob(): Promise<ServerStep> {
  const step = { id: 'blob' as const, title: 'Connect file storage' };
  if (!blobConfigured()) {
    return {
      ...step,
      state: 'todo',
      detail: 'No Blob store found. In your Vercel project open Storage, create a private Blob store, connect it, then redeploy. Images and videos need it.',
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
  const [[gatewayStep, creditsStep], blobStep] = await Promise.all([checkGatewayAndCredits(), checkBlob()]);
  const steps: ServerStep[] = [
    checkDeploy(),
    checkSecret(),
    gatewayStep,
    blobStep,
    creditsStep,
    { id: 'connect', title: 'Get your link and test it', state: 'todo', detail: 'Paste your secret to build the link, then test it.' },
    { id: 'chat', title: 'Add it to your chat app', state: 'todo', detail: 'Add the link as a connector in Claude, ChatGPT or another MCP app.' },
  ];
  cache = { at: Date.now(), steps };
  return steps;
}
