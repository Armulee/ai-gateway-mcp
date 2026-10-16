'use client';

import type { DashboardLinks } from '@/lib/site';
import { ActionSteps } from './action-steps';

// Under "Connect file storage" until a store is connected. The app holds no
// token that can create a store or redeploy, so these open the dashboard.
// Before MCP_SECRET is set, the redeploy waits for the next step, so one
// redeploy applies both.

export function BlobPanel({ links, secretSet }: { links: DashboardLinks; secretSet: boolean }) {
  const create = `${links.direct ? 'Create' : 'Pick this project, create'} a Blob store with Private access, and connect it.`;
  if (!secretSet) {
    return (
      <ActionSteps
        actions={[{ label: 'Create Blob store', href: links.storage }]}
        hints={[create, 'Don’t redeploy yet: you redeploy once, after setting your secret in the next step.']}
      />
    );
  }
  return (
    <ActionSteps
      actions={[
        { label: 'Create Blob store', href: links.storage },
        { label: 'Redeploy', href: links.deployments },
      ]}
      hints={[create, 'Redeploy, then reload this page.', 'Redeploy, then reload this page.']}
    />
  );
}
