// MCP over stdio, with the same tools as the deployed /mcp/<secret> endpoint.
//
// For local MCP clients and for directories that start a server in a sandbox
// to list its tools (Glama). Your Vercel deployment does not use this file.
//
// There is no secret here: a stdio server is a process you start yourself, and
// it spends whatever AI Gateway credentials it is given (AI_GATEWAY_API_KEY, or
// VERCEL_OIDC_TOKEN from `vercel env pull`). Listing tools needs neither.
//
// Build and run:
//   npm run build:stdio
//   AI_GATEWAY_API_KEY=... node dist/stdio.mjs

import { McpServer } from '@modelcontextprotocol/server';
import { serveStdio } from '@modelcontextprotocol/server/stdio';
import { instanceContext } from '@/lib/gateway';
import { registerGatewayTools, SERVER_INFO, SERVER_INSTRUCTIONS } from '@/lib/mcp';

serveStdio(() => {
  const server = new McpServer(SERVER_INFO, { capabilities: { tools: {}, resources: {} }, instructions: SERVER_INSTRUCTIONS });
  registerGatewayTools(server, instanceContext);
  return server;
});
