import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { Setup } from '@/components/setup/setup';
import { getConfig } from '@/lib/env';
import { getVercelProject } from '@/lib/project';
import { dashboardLinks, OPEN_COOKIE } from '@/lib/site';
import { getSetupSteps } from '@/lib/status';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = { title: 'Set up · AI Gateway MCP' };

export default async function Home({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const [steps, project, jar, params] = await Promise.all([getSetupSteps(), getVercelProject(), cookies(), searchParams]);
  // Once this browser has finished the setup, the guide goes away for good,
  // unless a step the server checks has come undone (MCP_SECRET removed, AI
  // Gateway unreachable) or the owner asks to see it (?steps).
  const serverStepsHold = steps.every((step) => step.optional || step.id === 'connect' || step.id === 'chat' || step.state === 'done');
  // Development only: /?preview-open shows the open page (and its intro) without a deployment.
  const previewOpen = process.env.NODE_ENV !== 'production' && params['preview-open'] !== undefined;
  const open = previewOpen || (jar.get(OPEN_COOKIE)?.value === '1' && serverStepsHold);
  const guide = !open || params.steps !== undefined;
  return <Setup steps={steps} open={open} guide={guide} linkTtlHours={getConfig().signedUrlTtlHours} links={dashboardLinks(project)} />;
}
