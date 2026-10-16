export const REPO_URL = 'https://github.com/armulee/ai-gateway-mcp';

// Vercel "Deploy" flow: clones the repo and creates a private Blob store. It does not ask for
// MCP_SECRET: a fresh copy starts with its endpoint off, and its setup page makes the secret
// (kept in that browser), so the owner pastes it once, into Vercel.
export const DEPLOY_URL =
  'https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Farmulee%2Fai-gateway-mcp&project-name=gateway-mcp&repository-name=gateway-mcp&stores=%5B%7B%22type%22%3A%22blob%22%2C%22access%22%3A%22private%22%7D%5D';

// The project's website (the landing lives in its own repo). Points at that
// repo until the site has its own address.
export const LANDING_URL = 'https://github.com/armulee/ai-gateway-mcp-landing';

/** Shown wherever this connector's spend would be, when the team's plan has no usage report (lib/stats.ts). */
export const PAID_PLAN_NOTE =
  "This connector's own spend needs AI Gateway's usage report, which Vercel offers on paid plans. This team's plan doesn't include it.";

/** AI Gateway's overview in the Vercel dashboard, where the team's totals show. */
export const GATEWAY_DASHBOARD_URL = `https://vercel.com/d?to=${encodeURIComponent('/[team]/~/ai-gateway')}&title=${encodeURIComponent('Open AI Gateway')}`;
export const VERCEL_PRICING_URL = 'https://vercel.com/pricing';

export type VercelProject = { owner: string; name: string };
export type DashboardLinks = { envVars: string; deployments: string; storage: string; direct: boolean; project?: VercelProject };

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
  return { envVars: at('settings/environment-variables'), deployments: at('deployments'), storage: at('stores'), direct: Boolean(project), project };
}

/**
 * Set by the setup page once every required step is done. The server reads it
 * to show the page without the guide, as long as its own checks still pass.
 * It holds no secret, only a flag.
 */
export const OPEN_COOKIE = 'gateway-open';
