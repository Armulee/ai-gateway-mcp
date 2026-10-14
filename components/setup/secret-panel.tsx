'use client';

import { useState } from 'react';
import { DEPLOYMENTS_URL, ENV_VARS_URL } from '@/lib/site';
import { CopyButton } from './copy-button';

// Makes a secret in the browser and points to where it goes in Vercel. The
// value never leaves this page: the owner pastes it into Vercel themselves,
// since this app holds no token that could write Environment Variables.

function randomSecret(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

function Steps() {
  const [generated, setGenerated] = useState('');
  return (
    <div className="secret-panel">
      <ol className="secret-steps">
        <li>
          <p>Generate 64 random characters. They are made in your browser and never sent anywhere.</p>
          <div className="url-row">
            <button type="button" className="btn btn-ghost btn-small" onClick={() => setGenerated(randomSecret())}>
              {generated ? 'Generate again' : 'Generate'}
            </button>
            {generated && (
              <>
                <code className="url-value">{generated}</code>
                <CopyButton value={generated} />
              </>
            )}
          </div>
        </li>
        <li>
          <p>
            Open Environment Variables, pick this project, and save the value as <code>MCP_SECRET</code>.
          </p>
          <a className="btn btn-primary btn-small" href={ENV_VARS_URL} target="_blank" rel="noopener noreferrer">
            Open Environment Variables
          </a>
        </li>
        <li>
          <p>Redeploy so the new value takes effect, then come back to this page.</p>
          <a className="btn btn-ghost btn-small" href={DEPLOYMENTS_URL} target="_blank" rel="noopener noreferrer">
            Open Deployments
          </a>
        </li>
      </ol>
    </div>
  );
}

/** Under "Set MCP_SECRET": the steps to set one, or folded away as a way to rotate it once set. */
export function SecretPanel({ isSet }: { isSet: boolean }) {
  if (!isSet) return <Steps />;
  return (
    <details className="generator">
      <summary>Make a new secret (rotate)</summary>
      <p>The old link stops working once you save the new value and redeploy. Update your chat apps with the new link.</p>
      <Steps />
    </details>
  );
}
