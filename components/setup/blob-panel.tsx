'use client';

import type { DashboardLinks } from '@/lib/site';
import { ActionSteps } from './action-steps';

// Under "Connect file storage" until a store is connected. The app holds no
// token that can create a store or redeploy, so these open the dashboard.

export function BlobPanel({ links }: { links: DashboardLinks }) {
  return (
    <ActionSteps
      actions={[
        { label: 'Create Blob store', href: links.storage },
        { label: 'Redeploy', href: links.deployments },
      ]}
      hints={[
        `${links.direct ? 'Create' : 'Pick this project, create'} a Blob store with Private access, and connect it.`,
        'Redeploy, then reload this page.',
        'Redeploy, then reload this page.',
      ]}
    />
  );
}
