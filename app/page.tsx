import type { Metadata } from 'next';
import { Setup } from '@/components/setup/setup';
import { getConfig } from '@/lib/env';
import { getVercelProject } from '@/lib/project';
import { dashboardLinks } from '@/lib/site';
import { getSetupSteps } from '@/lib/status';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = { title: 'Set up · AI Gateway MCP' };

export default async function Home() {
  const [steps, project] = await Promise.all([getSetupSteps(), getVercelProject()]);
  return <Setup steps={steps} linkTtlHours={getConfig().signedUrlTtlHours} links={dashboardLinks(project)} />;
}
