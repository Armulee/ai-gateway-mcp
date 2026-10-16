import { registerAppResource, registerAppTool, RESOURCE_MIME_TYPE } from '@modelcontextprotocol/ext-apps/server';
import type { CallToolResult, McpServer } from '@modelcontextprotocol/server';
import { createMcpHandler } from 'mcp-handler';
import { createHash } from 'node:crypto';
import type { z } from 'zod';
import { currentRequest, type ToolContext } from './gateway';
import { checkCreditsTool, listFilesTool } from './tools/account';
import { editImageTool, upscaleImageTool } from './tools/edit-image';
import { generateImageTool } from './tools/generate-image';
import { generateTextTool } from './tools/generate-text';
import { getVideoTool } from './tools/get-video';
import { listModels } from './tools/list-models';
import { generateSpeechTool, transcribeTool } from './tools/speech';
import { startVideoTool } from './tools/start-video';
import { editVideoTool, extendVideoTool, motionControlTool, upscaleVideoTool } from './tools/video-tools';

import { MEDIA_VIEW_URI } from './ui/media-types';
import { MEDIA_VIEW_HTML } from './ui/media-view.generated';

type Tool = {
  name: string;
  description: string;
  inputSchema: z.ZodObject;
  run: (args: never, ctx: ToolContext) => Promise<CallToolResult>;
};

/** Tools whose results show in the media view (MCP Apps) in hosts that support it. */
const UI_TOOLS = new Set(['generate_image', 'edit_image', 'upscale_image', 'get_video', 'list_files']);

/** Every tool the connector offers, in the order chat apps list them. */
const TOOLS: Tool[] = [
  listModels,
  generateTextTool,
  generateImageTool,
  editImageTool,
  upscaleImageTool,
  startVideoTool,
  motionControlTool,
  upscaleVideoTool,
  editVideoTool,
  extendVideoTool,
  getVideoTool,
  generateSpeechTool,
  transcribeTool,
  checkCreditsTool,
  listFilesTool,
];

/**
 * The media view's sandbox settings. Its images, video and audio load from
 * this deployment's private Blob links. Claude names each app's sandbox origin
 * from the connector URL: the first 32 hex characters of its SHA-256, under
 * claudemcpcontent.com. Other hosts pick their own, so the domain is set for
 * Claude only. The URL holds the secret: it is hashed, never logged.
 */
function mediaViewMeta() {
  const { client, connectorUrl } = currentRequest();
  const domain =
    client === 'claude' && connectorUrl ? `${createHash('sha256').update(connectorUrl).digest('hex').slice(0, 32)}.claudemcpcontent.com` : undefined;
  return {
    ui: {
      csp: { resourceDomains: ['https://*.blob.vercel-storage.com'] },
      prefersBorder: false,
      ...(domain ? { domain } : {}),
    },
  };
}

export const SERVER_INFO = { name: 'gateway-mcp', version: '0.1.0' };

/**
 * Registers every tool and the media view on `server`. Shared by the HTTP
 * route and the stdio entry (scripts/stdio.ts), so both offer the same tools.
 */
export function registerGatewayTools(server: McpServer, getContext: () => ToolContext) {
  for (const tool of TOOLS) {
    const config = { description: tool.description, inputSchema: tool.inputSchema };
    const run = (args: unknown) => tool.run(args as never, getContext());
    if (UI_TOOLS.has(tool.name)) {
      // Hosts with MCP Apps show the result in the media view; others use its plain content.
      registerAppTool(server, tool.name, { ...config, _meta: { ui: { resourceUri: MEDIA_VIEW_URI } } }, run);
    } else {
      server.registerTool(tool.name, config, run);
    }
  }
  registerAppResource(
    server,
    'AI Gateway media',
    MEDIA_VIEW_URI,
    { description: 'Shows pictures, video and audio from this connector inline, with download, upscale and extend.', mimeType: RESOURCE_MIME_TYPE },
    () => ({ contents: [{ uri: MEDIA_VIEW_URI, mimeType: RESOURCE_MIME_TYPE, text: MEDIA_VIEW_HTML, _meta: mediaViewMeta() }] }),
  );
}

/**
 * Builds the MCP request handler. Authentication happens before this handler
 * runs (the secret path in v1); `getContext` decides whose Gateway credits and
 * Blob namespace the tools use.
 */
export function createGatewayMcpHandler(getContext: () => ToolContext) {
  return createMcpHandler((server) => registerGatewayTools(server, getContext), { serverInfo: SERVER_INFO, verboseLogs: false });
}
