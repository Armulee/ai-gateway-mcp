'use client';

import { useEffect, useState } from 'react';

const INTRO_MS = 2200;
const IDLE_MS = 10_000;

/**
 * "Scroll", turned to run up the right edge under the chapter rail. It shows
 * once the intro has played, hides the moment the reader scrolls, and comes
 * back after ten seconds without scrolling anywhere before the finale.
 */
export function ScrollHint() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let timer = 0;
    const show = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      if (window.scrollY < max - window.innerHeight * 0.8) setVisible(true);
    };
    const wake = () => {
      setVisible(false);
      window.clearTimeout(timer);
      timer = window.setTimeout(show, IDLE_MS);
    };
    timer = window.setTimeout(show, INTRO_MS);
    const events = ['scroll', 'wheel', 'keydown', 'touchstart'] as const;
    events.forEach((name) => window.addEventListener(name, wake, { passive: true }));
    return () => {
      window.clearTimeout(timer);
      events.forEach((name) => window.removeEventListener(name, wake));
    };
  }, []);

  return (
    <div className={`scroll-hint${visible ? ' is-visible' : ''}`} aria-hidden="true">
      <span>Scroll</span>
      <i />
    </div>
  );
}
