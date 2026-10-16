'use client';

import { useEffect, useRef, useState } from 'react';
import { isReload } from '../motion/smooth-scroll';
import { OPEN_STEP, type StepView } from './steps';

// While the hero offers "Set up with your agent" or "Set up manually", the
// step guide waits folded. Any link to a step ("Set up manually", the arch's
// stones, the rail) unfolds it first, so the scroll that follows lands on the
// step. Open on the server and without JavaScript, as before.

export function GuideFold({ steps, folded, children }: { steps: StepView[]; folded: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(true);
  const wrap = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // A link straight to a step (e.g. /?steps#secret) keeps it open.
    const linked = !isReload() && steps.some((s) => `#${s.id}` === window.location.hash);
    setOpen(!folded || linked);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [folded]);

  useEffect(() => {
    if (open) return;
    const ids = new Set(steps.map((s) => `#${s.id}`));
    // Unfold now, not on React's next render, so the scroll right after finds the step.
    const unfold = () => {
      wrap.current?.classList.remove('is-folded');
      setOpen(true);
      window.dispatchEvent(new Event('resize'));
    };
    const onClick = (event: MouseEvent) => {
      const href = (event.target as Element | null)?.closest('a[href^="#"]')?.getAttribute('href');
      if (href && ids.has(href)) unfold();
    };
    document.addEventListener('click', onClick, true);
    window.addEventListener(OPEN_STEP, unfold);
    return () => {
      document.removeEventListener('click', onClick, true);
      window.removeEventListener(OPEN_STEP, unfold);
    };
  }, [open, steps]);

  return (
    <div ref={wrap} className={`guide-wrap${open ? '' : ' is-folded'}`}>
      {children}
    </div>
  );
}
