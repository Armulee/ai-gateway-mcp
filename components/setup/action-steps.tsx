'use client';

import { useState } from 'react';

// A short row of buttons done left to right. The one to press now is solid,
// done ones get a tick, and one line under the row says what happens next.

export type Action = { label: string; href?: string; run?: () => Promise<void> | void };

export function ActionSteps({ actions, hints, children }: { actions: Action[]; hints: React.ReactNode[]; children?: React.ReactNode }) {
  const [stage, setStage] = useState(0);
  return (
    <div className="action-steps">
      <div className="action-row">
        {actions.map((action, i) => {
          const advance = () => setStage((s) => Math.max(s, i + 1));
          const className = `btn btn-small ${i === stage ? 'btn-primary' : 'btn-ghost'}`;
          const content = (
            <>
              <span className="action-num" aria-hidden="true">
                {i < stage ? '✓' : i + 1}
              </span>
              {action.label}
            </>
          );
          return action.href ? (
            <a key={action.label} className={className} href={action.href} target="_blank" rel="noopener noreferrer" onClick={advance}>
              {content}
              <span className="sr-only"> (opens Vercel in a new tab)</span>
            </a>
          ) : (
            <button
              key={action.label}
              type="button"
              className={className}
              onClick={async () => {
                await action.run?.();
                advance();
              }}
            >
              {content}
            </button>
          );
        })}
      </div>
      <p className="action-hint" aria-live="polite">
        {hints[Math.min(stage, hints.length - 1)]}
      </p>
      {children}
    </div>
  );
}
