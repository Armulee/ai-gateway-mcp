import { DEPLOYMENTS_URL, STORAGE_URL } from '@/lib/site';

// Under "Connect file storage" until a store is connected. The app holds no
// token that can create a store or redeploy, so these open the dashboard.

export function BlobPanel() {
  return (
    <div className="blob-panel">
      <ol className="secret-steps">
        <li>
          <p>
            Open Storage, pick this project, then create a <strong>Blob</strong> store with <strong>Private</strong> access and connect it.
          </p>
          <a className="btn btn-primary btn-small" href={STORAGE_URL} target="_blank" rel="noopener noreferrer">
            Open Storage
          </a>
        </li>
        <li>
          <p>Redeploy so the connection takes effect, then come back to this page.</p>
          <a className="btn btn-ghost btn-small" href={DEPLOYMENTS_URL} target="_blank" rel="noopener noreferrer">
            Open Deployments
          </a>
        </li>
      </ol>
    </div>
  );
}
