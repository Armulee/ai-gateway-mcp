import { Landing } from '@/components/landing/landing';
import { getCatalogSummary } from '@/lib/catalog-summary';
import { getConfig } from '@/lib/env';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const { siteMode, signedUrlTtlHours } = getConfig();
  return (
    <Landing
      catalog={await getCatalogSummary()}
      linkTtlHours={signedUrlTtlHours}
      mode={siteMode === 'landing' ? 'author' : 'instance'}
    />
  );
}
