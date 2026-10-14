import { Landing } from '@/components/landing/landing';
import { Setup } from '@/components/setup/setup';
import { FALLBACK_COUNTS, getCatalogSummary } from '@/lib/catalog-summary';
import { getConfig } from '@/lib/env';
import { getStatusChecks } from '@/lib/status';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const { siteMode, signedUrlTtlHours } = getConfig();
  if (siteMode === 'landing') {
    return <Landing catalog={await getCatalogSummary()} linkTtlHours={signedUrlTtlHours} />;
  }
  const [checks, catalog] = await Promise.all([getStatusChecks(), getCatalogSummary()]);
  return <Setup checks={checks} counts={catalog?.counts ?? FALLBACK_COUNTS} linkTtlHours={signedUrlTtlHours} />;
}
