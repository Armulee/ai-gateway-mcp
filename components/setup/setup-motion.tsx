'use client';

import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useEffect } from 'react';

gsap.registerPlugin(ScrollTrigger);

// The setup page is for reading: steps ease in once as they arrive and the
// timeline line fills as you go. No pinning, no scroll hijack.
export function SetupMotion() {
  useEffect(() => {
    const mm = gsap.matchMedia();
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      gsap.utils.toArray<HTMLElement>('[data-reveal]').forEach((el, i) => {
        gsap.fromTo(
          el,
          { y: 32, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 0.9,
            ease: 'expo.out',
            delay: i < 2 ? i * 0.1 : 0,
            scrollTrigger: { trigger: el, start: 'top 92%', once: true },
          },
        );
      });
      gsap.fromTo(
        '.timeline',
        { '--progress': 0 },
        { '--progress': 1, ease: 'none', scrollTrigger: { trigger: '.timeline', start: 'top 60%', end: 'bottom 60%', scrub: true } },
      );
    });
    return () => mm.revert();
  }, []);

  return null;
}
