'use client';

import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useEffect } from 'react';
import { cosmos } from '../cosmos/store';

gsap.registerPlugin(ScrollTrigger);

// The setup page is for reading: steps ease in once as they arrive, the
// timeline line fills as you go, and the eclipse fades so it never sits
// behind the steps. No pinning, no scroll hijack.
export function SetupMotion() {
  useEffect(() => {
    const mm = gsap.matchMedia();
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      gsap.fromTo(cosmos, { eclipseScale: 0.45, stars: 0 }, { eclipseScale: 0.62, stars: 0.7, duration: 2.4, ease: 'expo.out' });
      gsap.fromTo(
        cosmos,
        { eclipse: 1, dust: 0.8 },
        { eclipse: 0, dust: 0.4, ease: 'none', immediateRender: false, scrollTrigger: { start: 0, end: 520, scrub: true } },
      );
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
