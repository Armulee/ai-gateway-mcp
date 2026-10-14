'use client';

import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useEffect } from 'react';

gsap.registerPlugin(ScrollTrigger);

// Setup page motion stays quiet: panels ease in once, and the step rail
// highlights the section being read. No pinning, no scroll hijack.
export function SetupMotion() {
  useEffect(() => {
    const mm = gsap.matchMedia();
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      gsap.utils.toArray<HTMLElement>('[data-reveal]').forEach((el, i) => {
        gsap.fromTo(
          el,
          { y: 36, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 0.9,
            ease: 'expo.out',
            delay: i < 3 ? i * 0.08 : 0,
            scrollTrigger: { trigger: el, start: 'top 92%', once: true },
          },
        );
      });
    });

    // The rail works with or without motion.
    const triggers = gsap.utils.toArray<HTMLElement>('[data-step]').map((step) =>
      ScrollTrigger.create({
        trigger: step,
        start: 'top 45%',
        end: 'bottom 45%',
        onToggle: ({ isActive }) => {
          document.querySelector(`[data-rail="${step.id}"]`)?.classList.toggle('is-active', isActive);
        },
      }),
    );

    return () => {
      mm.revert();
      triggers.forEach((t) => t.kill());
    };
  }, []);

  return null;
}
