export const REPO_URL = 'https://github.com/armulee/ai-gateway-mcp';

// Vercel "Deploy" flow: clones the repo, asks for MCP_SECRET and creates a private Blob store.
export const DEPLOY_URL =
  'https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Farmulee%2Fai-gateway-mcp&project-name=gateway-mcp&repository-name=gateway-mcp&env=MCP_SECRET&envDescription=A%20long%20random%20secret%20%28at%20least%2032%20characters%29.%20It%20becomes%20part%20of%20your%20connector%20URL%2C%20so%20keep%20it%20private.%20Generate%20one%20with%3A%20openssl%20rand%20-hex%2032&envLink=https%3A%2F%2Fgithub.com%2Farmulee%2Fai-gateway-mcp%23mcp_secret&stores=%5B%7B%22type%22%3A%22blob%22%2C%22access%22%3A%22private%22%7D%5D';

// The project's website (the landing lives in its own repo). Points at that
// repo until the site has its own address.
export const LANDING_URL = 'https://github.com/armulee/ai-gateway-mcp-landing';

export type VercelProject = { owner: string; name: string };
export type DashboardLinks = { envVars: string; deployments: string; storage: string; direct: boolean };

/**
 * Pages of the owner's project in the Vercel dashboard. With the team and
 * project known (see lib/project.ts) they open it directly; otherwise
 * Vercel's "/d?to=" link asks which project to open.
 */
export function dashboardLinks(project?: VercelProject): DashboardLinks {
  const at = (path: string) =>
    project
      ? `https://vercel.com/${encodeURIComponent(project.owner)}/${encodeURIComponent(project.name)}/${path}`
      : `https://vercel.com/d?to=${encodeURIComponent(`/[team]/[project]/${path}`)}`;
  return { envVars: at('settings/environment-variables'), deployments: at('deployments'), storage: at('stores'), direct: Boolean(project) };
}
