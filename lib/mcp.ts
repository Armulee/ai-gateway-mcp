import { createMcpHandler } from 'mcp-handler';
import type { ToolContext } from './gateway';
import { generateImageTool } from './tools/generate-image';
import { generateTextTool } from './tools/generate-text';
import { getVideoTool } from './tools/get-video';
import { listModels } from './tools/list-models';
import { startVideoTool } from './tools/start-video';

/**
 * Builds the MCP request handler. Authentication happens before this handler
 * runs (the secret path in v1); `getContext` decides whose Gateway credits and
 * Blob namespace the tools use.
 */
export function createGatewayMcpHandler(getContext: () => ToolContext) {
  return createMcpHandler(
    (server) => {
      server.registerTool(
        listModels.name,
        { description: listModels.description, inputSchema: listModels.inputSchema },
        (args) => listModels.run(args, getContext()),
      );
      server.registerTool(
        generateTextTool.name,
        { description: generateTextTool.description, inputSchema: generateTextTool.inputSchema },
        (args) => generateTextTool.run(args, getContext()),
      );
      server.registerTool(
        generateImageTool.name,
        { description: generateImageTool.description, inputSchema: generateImageTool.inputSchema },
        (args) => generateImageTool.run(args, getContext()),
      );
      server.registerTool(
        startVideoTool.name,
        { description: startVideoTool.description, inputSchema: startVideoTool.inputSchema },
        (args) => startVideoTool.run(args, getContext()),
      );
      server.registerTool(
        getVideoTool.name,
        { description: getVideoTool.description, inputSchema: getVideoTool.inputSchema },
        (args) => getVideoTool.run(args, getContext()),
      );
    },
    { serverInfo: { name: 'gateway-mcp', version: '0.1.0' }, verboseLogs: false },
  );
}
