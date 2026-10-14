import type { Metadata } from 'next';
import { Setup } from '@/components/setup/setup';
import { getConfig } from '@/lib/env';
import { getStatusChecks } from '@/lib/status';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = { title: 'Set up · AI Gateway MCP' };

export default async function SetupPage() {
  return <Setup checks={await getStatusChecks()} linkTtlHours={getConfig().signedUrlTtlHours} />;
}
