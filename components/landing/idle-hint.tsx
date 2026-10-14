'use client';

import { useEffect, useState } from 'react';

const IDLE_MS = 10_000;

/**
 * If the reader stops scrolling for ten seconds somewhere in the middle of
 * the story, the hero's scroll cue comes back to say there is more below.
 * Any scroll, wheel, key or touch hides it and starts the wait again.
 */
export function IdleHint() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let timer = 0;
    const check = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const y = window.scrollY;
      // Not in the hero (it has its own cue), not at the end.
      if (y > window.innerHeight * 0.6 && y < max - window.innerHeight * 0.8) setVisible(true);
    };
    const wake = () => {
      setVisible(false);
      window.clearTimeout(timer);
      timer = window.setTimeout(check, IDLE_MS);
    };
    const events = ['scroll', 'wheel', 'keydown', 'touchstart', 'pointerdown'] as const;
    events.forEach((name) => window.addEventListener(name, wake, { passive: true }));
    wake();
    return () => {
      window.clearTimeout(timer);
      events.forEach((name) => window.removeEventListener(name, wake));
    };
  }, []);

  return (
    <div className={`scroll-cue idle-cue${visible ? ' is-visible' : ''}`} aria-hidden="true">
      <span>Scroll</span>
      <i />
    </div>
  );
}
