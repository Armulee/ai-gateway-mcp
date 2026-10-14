import {
  gateway,
  GatewayAuthenticationError,
  GatewayModelNotFoundError,
  GatewayRateLimitError,
  type GatewayProvider,
} from '@ai-sdk/gateway';
import type { CallToolResult } from '@modelcontextprotocol/server';

/**
 * Everything a tool needs that depends on *who* is calling. In v1 there is a
 * single owner: the default gateway authenticates with the deployment's OIDC
 * token (or AI_GATEWAY_API_KEY), billing the team that owns the deployment.
 * A v2 per-user auth layer only has to build a different context, e.g.
 * createGateway({ apiKey: accessToken, teamIdOrSlug }) and a per-user prefix.
 */
export type ToolContext = {
  gateway: GatewayProvider;
  /** Namespaces derived keys and Blob paths per owner. */
  keyPrefix: string;
};

export function instanceContext(): ToolContext {
  return { gateway, keyPrefix: 'instance' };
}

export function textResult(text: string): CallToolResult {
  return { content: [{ type: 'text', text }] };
}

export function errorResult(text: string): CallToolResult {
  return { isError: true, content: [{ type: 'text', text }] };
}

type ErrorLike = {
  message?: string;
  statusCode?: number;
  cause?: unknown;
  lastError?: unknown;
};

// The AI SDK wraps failures (RetryError.lastError, NoContentGeneratedError.cause, ...),
// so collect the whole chain and read names and status codes from any level.
function errorChain(error: unknown): ErrorLike[] {
  const chain: ErrorLike[] = [];
  let current = error as ErrorLike | undefined;
  while (current && typeof current === 'object' && chain.length < 5) {
    chain.push(current);
    current = (current.lastError ?? current.cause) as ErrorLike | undefined;
  }
  return chain;
}

/**
 * Turns any failure into a readable tool error that names the model.
 * The exact Gateway wording for out-of-credit and plan errors is not
 * documented, so those are matched on status code and message.
 */
export function toolError(
  error: unknown,
  modelId: string,
  kind: 'text' | 'image' | 'video' | 'models' = 'text',
): CallToolResult {
  const chain = errorChain(error);
  const status = chain.find((e) => typeof e.statusCode === 'number')?.statusCode;
  // Class names do not survive bundling, so match with the SDK's isInstance markers.
  const is = (check: (e: unknown) => boolean) => chain.some((e) => check(e));
  const message = String(chain.at(-1)?.message ?? error ?? 'Unknown error').slice(0, 500);
  const lower = chain.map((e) => e.message ?? '').join(' ').toLowerCase();

  if (is(GatewayModelNotFoundError.isInstance) || /model.*not found|unknown model|no such model/.test(lower)) {
    return errorResult(
      `Unknown model "${modelId}". Call list_models to see the ids AI Gateway accepts.`,
    );
  }
  if (status === 402 || /insufficient|out of credit|credit balance|top.?up|no credits/.test(lower)) {
    return errorResult(
      `Not enough AI Gateway credits to run "${modelId}". Add credits in the Vercel dashboard (AI Gateway → Credits) and try again.`,
    );
  }
  // Without any credential the SDK throws a plain "Unauthenticated" error before calling the Gateway.
  if (is(GatewayAuthenticationError.isInstance) || status === 401 || /unauthenticated|invalid api key|oidc/.test(lower)) {
    return errorResult(
      `AI Gateway rejected this deployment's credentials while calling "${modelId}". On Vercel the OIDC token is used automatically; locally run \`vercel env pull\` again (tokens last 12 hours) or set AI_GATEWAY_API_KEY.`,
    );
  }
  if (kind === 'video' && (status === 403 || /plan|paid|upgrade|not available|not enabled/.test(lower))) {
    return errorResult(
      `Video generation with "${modelId}" is not available for this Vercel team. Video needs paid AI Gateway credits. Gateway said: ${message}`,
    );
  }
  if (is(GatewayRateLimitError.isInstance) || status === 429) {
    return errorResult(`Rate limited while calling "${modelId}". Wait a moment and retry.`);
  }
  return errorResult(`Provider error from "${modelId}"${status ? ` (HTTP ${status})` : ''}: ${message}`);
}
