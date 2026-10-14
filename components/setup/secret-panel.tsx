'use client';

import { useState } from 'react';
import { DEPLOYMENTS_URL, ENV_VARS_URL } from '@/lib/site';
import { ActionSteps } from './action-steps';
import { adoptGeneratedSecret } from './setup-store';

// Makes a secret in the browser and points to where it goes in Vercel. The
// value never leaves this page: the owner pastes it into Vercel themselves,
// since this app holds no token that could write Environment Variables.

function randomSecret(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

function Steps() {
  const [secret, setSecret] = useState('');
  const [copied, setCopied] = useState(false);

  async function makeAndCopy() {
    const value = randomSecret();
    setSecret(value);
    adoptGeneratedSecret(value);
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <ActionSteps
      actions={[
        { label: 'Copy a new secret', run: makeAndCopy },
        { label: 'Add it in Vercel', href: ENV_VARS_URL },
        { label: 'Redeploy', href: DEPLOYMENTS_URL },
      ]}
      hints={[
        'Makes a random 64-character secret in your browser and copies it.',
        copied ? (
          <>
            Copied <code>{`${secret.slice(0, 6)}…${secret.slice(-4)}`}</code>. Pick this project and paste it as <code>MCP_SECRET</code>.
          </>
        ) : (
          <>
            Copy it below, then pick this project and paste it as <code>MCP_SECRET</code>.
          </>
        ),
        'Redeploy, then reload this page. Your link below is already filled in.',
      ]}
    >
      {secret && !copied && <code className="url-value">{secret}</code>}
    </ActionSteps>
  );
}

/** Under "Set MCP_SECRET": the steps to set one, or folded away as a way to rotate it once set. */
export function SecretPanel({ isSet }: { isSet: boolean }) {
  if (!isSet) return <Steps />;
  return (
    <details className="generator">
      <summary>Make a new secret</summary>
      <p>Your old link stops working after the redeploy. Update it in your chat apps.</p>
      <Steps />
    </details>
  );
}
