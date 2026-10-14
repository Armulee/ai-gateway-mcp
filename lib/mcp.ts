import type { CallToolResult } from '@modelcontextprotocol/server';
import { createMcpHandler } from 'mcp-handler';
import type { z } from 'zod';
import type { ToolContext } from './gateway';
import { checkCreditsTool, listFilesTool } from './tools/account';
import { editImageTool, upscaleImageTool } from './tools/edit-image';
import { generateImageTool } from './tools/generate-image';
import { generateTextTool } from './tools/generate-text';
import { getVideoTool } from './tools/get-video';
import { listModels } from './tools/list-models';
import { generateSpeechTool, transcribeTool } from './tools/speech';
import { startVideoTool } from './tools/start-video';
import { editVideoTool, extendVideoTool, motionControlTool, upscaleVideoTool } from './tools/video-tools';

type Tool = {
  name: string;
  description: string;
  inputSchema: z.ZodObject;
  run: (args: never, ctx: ToolContext) => Promise<CallToolResult>;
};

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
 * Builds the MCP request handler. Authentication happens before this handler
 * runs (the secret path in v1); `getContext` decides whose Gateway credits and
 * Blob namespace the tools use.
 */
export function createGatewayMcpHandler(getContext: () => ToolContext) {
  return createMcpHandler(
    (server) => {
      for (const tool of TOOLS) {
        server.registerTool(tool.name, { description: tool.description, inputSchema: tool.inputSchema }, (args) =>
          tool.run(args as never, getContext()),
        );
      }
    },
    { serverInfo: { name: 'gateway-mcp', version: '0.1.0' }, verboseLogs: false },
  );
}
