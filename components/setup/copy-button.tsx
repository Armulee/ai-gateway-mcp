'use client';

import { useState } from 'react';

export function CopyButton({ value, label = 'Copy', onCopy }: { value: string; label?: string; onCopy?: () => void }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="btn btn-ghost btn-small"
      onClick={async () => {
        await navigator.clipboard.writeText(value);
        onCopy?.();
        setCopied(true);
        setTimeout(() => setCopied(false), 1600);
      }}
    >
      {copied ? 'Copied' : label}
    </button>
  );
}
