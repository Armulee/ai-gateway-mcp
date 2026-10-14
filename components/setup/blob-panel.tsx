'use client';

import { DEPLOYMENTS_URL, STORAGE_URL } from '@/lib/site';
import { ActionSteps } from './action-steps';

// Under "Connect file storage" until a store is connected. The app holds no
// token that can create a store or redeploy, so these open the dashboard.

export function BlobPanel() {
  return (
    <ActionSteps
      actions={[
        { label: 'Create Blob store', href: STORAGE_URL },
        { label: 'Redeploy', href: DEPLOYMENTS_URL },
      ]}
      hints={[
        'Pick this project, create a Blob store with Private access, and connect it.',
        'Redeploy, then reload this page.',
        'Redeploy, then reload this page.',
      ]}
    />
  );
}
