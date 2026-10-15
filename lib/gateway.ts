import {
  gateway,
  GatewayAuthenticationError,
  GatewayModelNotFoundError,
  GatewayRateLimitError,
  type GatewayProvider,
} from '@ai-sdk/gateway';
import type { CallToolResult } from '@modelcontextprotocol/server';
import type { Warning } from 'ai';
import { AsyncLocalStorage } from 'node:async_hooks';

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
  /** AI Gateway request options that tag a call for the usage stats. */
  gatewayOptions: (tool: string) => { gateway: { tags: string[] } };
};

/** Every call from this MCP carries this tag, so its spend can be reported on its own. */
export const STATS_TAG = 'ai-gateway-mcp';

/** The chat app making the current MCP request, set per request by the route. */
const requestClient = new AsyncLocalStorage<string>();

export function withClient<T>(client: string, run: () => T): T {
  return requestClient.run(client, run);
}

/**
 * Names the chat app from its User-Agent. A stateless MCP request carries no
 * client info of its own (that only comes with `initialize`), so this is a
 * best guess; anything unrecognised is grouped as "other".
 */
export function clientFromUserAgent(userAgent: string | null): string {
  const ua = (userAgent ?? '').toLowerCase();
  if (/claude|anthropic/.test(ua)) return 'claude';
  if (/openai|chatgpt/.test(ua)) return 'chatgpt';
  if (/cursor/.test(ua)) return 'cursor';
  if (/vscode|visual studio code|copilot/.test(ua)) return 'vscode';
  return 'other';
}

export function instanceContext(): ToolContext {
  const client = requestClient.getStore() ?? 'other';
  return {
    gateway,
    keyPrefix: 'instance',
    gatewayOptions: (tool) => ({ gateway: { tags: [STATS_TAG, `tool:${tool}`, `client:${client}`] } }),
  };
}

export function textResult(text: string): CallToolResult {
  return { content: [{ type: 'text', text }] };
}

export function errorResult(text: string): CallToolResult {
  return { isError: true, content: [{ type: 'text', text }] };
}

/** An AI SDK warning (e.g. an option the model ignored) as a line for the tool reply. */
export function warningNote(warning: Warning): string {
  switch (warning.type) {
    case 'unsupported':
    case 'compatibility':
      return `Note: "${warning.feature}" ${warning.type === 'unsupported' ? 'is not supported' : 'ran in compatibility mode'}${warning.details ? `. ${warning.details}` : ''}`;
    case 'deprecated':
      return `Note: "${warning.setting}" is deprecated. ${warning.message}`;
    default:
      return `Note: ${warning.message}`;
  }
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
  kind: 'text' | 'image' | 'video' | 'speech' | 'transcription' | 'credits' | 'files' | 'models' = 'text',
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
