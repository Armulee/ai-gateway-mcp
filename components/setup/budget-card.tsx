'use client';

import { useEffect, useRef, useState } from 'react';
import { VercelMark } from '../vercel-badge';

// A leaked link can spend right up to the AI Gateway budget, so a low budget
// is the real protection. Vercel doesn't tell this page whether one is set, so
// the card never shows it as done: "I've set it" only folds it to one line, in
// this browser. It is not a setup step and blocks nothing.

const FOLDED = 'ai-gateway-mcp:budget-set';

export function BudgetCard({ href, project, team, first }: { href: string; project?: string; team: boolean; first: boolean }) {
  const [folded, setFolded] = useState(false);
  // Where focus goes after a fold or unfold, so it isn't lost with the button that vanished.
  const focusNext = useRef(false);
  const showRef = useRef<HTMLButtonElement>(null);
  const setRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    try {
      if (localStorage.getItem(FOLDED) === '1') setFolded(true);
    } catch {
      // No storage: the card stays open.
    }
  }, []);

  useEffect(() => {
    if (!focusNext.current) return;
    focusNext.current = false;
    (folded ? showRef : setRef).current?.focus();
  }, [folded]);

  const fold = (next: boolean) => {
    try {
      if (next) localStorage.setItem(FOLDED, '1');
      else localStorage.removeItem(FOLDED);
    } catch {
      // No storage: it folds for this visit only.
    }
    focusNext.current = true;
    setFolded(next);
  };

  const open = (
    <a className={`btn ${folded ? 'btn-ghost btn-small' : 'btn-primary'}`} href={href} target="_blank" rel="noopener noreferrer">
      <VercelMark />
      Open Budgets
      <span className="sr-only"> (opens Vercel in a new tab)</span>
    </a>
  );

  return (
    <section className={`setup-section budget${first ? ' is-first' : ''}${folded ? ' is-folded' : ''}`} id="budget" data-chapter="budget">
      {folded ? (
        <div className="budget-line">
          <p>
            <b>Spend limit.</b> <span className="dim">You said it&apos;s set.</span>
          </p>
          <div className="budget-actions">
            {open}
            <button ref={showRef} type="button" className="btn btn-ghost btn-small" onClick={() => fold(false)}>
              Show
            </button>
          </div>
        </div>
      ) : (
        <div className="budget-card">
          <h2 className="section-title">Set a spend limit.</h2>
          <p className="budget-lead">Anyone with your link can spend up to this limit, so keep it low.</p>
          <ol className="agent-flow budget-flow">
            <li>
              <span className="agent-num">1</span>
              <div>
                <b>Open AI Gateway in Vercel</b>
                <p>The button below goes straight to its Budgets page.</p>
              </div>
            </li>
            <li>
              <span className="agent-num">2</span>
              <div>
                {team ? (
                  <>
                    <b>Budgets → Team → Add budget</b>
                    <p>This copy spends through an API key, which only the team budget counts.</p>
                  </>
                ) : (
                  <>
                    <b>Budgets → Projects → Add budget</b>
                    <p>Pick {project ? <b className="budget-project">{project}</b> : 'this project'}. It caps only this connector, not the rest of your team.</p>
                  </>
                )}
              </div>
            </li>
            <li>
              <span className="agent-num">3</span>
              <div>
                <b>Set a monthly amount</b>
                <p>What you&apos;d expect to spend in a month, say $10. You can raise it any time.</p>
              </div>
            </li>
          </ol>
          <div className="budget-actions">
            {open}
            <button ref={setRef} type="button" className="btn btn-ghost" onClick={() => fold(true)}>
              I&apos;ve set it
            </button>
          </div>
          <p className="budget-note">Vercel doesn&apos;t tell this page whether a budget is set, so this stays until you say so.</p>
        </div>
      )}
    </section>
  );
}
