'use client';

import { gsap } from 'gsap';
import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin';
import { MotionPathPlugin } from 'gsap/MotionPathPlugin';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useEffect } from 'react';
import { setupOrbitRail } from '../orbit/orbit-rail';

gsap.registerPlugin(ScrollTrigger, DrawSVGPlugin, MotionPathPlugin);

// The setup page is a guide to read and act on, so nothing is pinned: each
// step plays its little film once as it arrives, the overview ring draws in
// on load, and the rail on the right tracks (and scrolls) the steps. With
// reduced motion everything simply rests finished.

export function SetupMotion() {
  useEffect(() => {
    const mm = gsap.matchMedia();
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      // Overview: the ring's arcs draw in one by one, the count settles.
      gsap.fromTo('[data-arc]', { drawSVG: '0%' }, { drawSVG: '100%', duration: 0.9, ease: 'power2.inOut', stagger: 0.12, delay: 0.2 });
      gsap.fromTo('.progress-copy > *', { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: 1, ease: 'expo.out', stagger: 0.1, delay: 0.3 });

      // Each step: its copy rises, its drawing draws itself, its star travels.
      gsap.utils.toArray<HTMLElement>('.guide-step').forEach((step) => {
        const art = step.querySelector('svg');
        const tl = gsap.timeline({ scrollTrigger: { trigger: step, start: 'top 80%', once: true } });
        tl.fromTo(step.querySelector('[data-guide-copy]'), { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 0.9, ease: 'expo.out' }, 0);
        tl.fromTo(step.querySelector('.guide-badge'), { scale: 0.4, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.6, ease: 'back.out(2.4)' }, 0);
        tl.fromTo(step.querySelectorAll('[data-tick]'), { drawSVG: '0%' }, { drawSVG: '100%', duration: 0.5, ease: 'power2.out' }, 0.35);
        if (!art) return;
        tl.fromTo(art.querySelectorAll('[data-draw]'), { drawSVG: '0%' }, { drawSVG: '100%', duration: 0.9, ease: 'power2.inOut', stagger: 0.12 }, 0.1);
        tl.fromTo(art.querySelectorAll('.fill, text'), { opacity: 0 }, { opacity: (_: number, el: Element) => Number(getComputedStyle(el).opacity) || 1, duration: 0.4, stagger: 0.05 }, 0.6);
        const route = art.querySelector<SVGPathElement>('[data-route]');
        const head = art.querySelector('[data-head]');
        if (route && head) {
          tl.fromTo(route, { drawSVG: '0%' }, { drawSVG: '100%', duration: 0.9, ease: 'power2.inOut' }, 0.3)
            .fromTo(head, { opacity: 0 }, { opacity: 1, duration: 0.1 }, 0.3)
            .fromTo(
              head,
              { motionPath: { path: route, align: route, alignOrigin: [0.5, 0.5], start: 0, end: 0 } },
              { motionPath: { path: route, align: route, alignOrigin: [0.5, 0.5], start: 0, end: 1 }, duration: 0.9, ease: 'power2.inOut' },
              0.3,
            )
            .to(head, { opacity: 0, duration: 0.3 }, 1.25);
        }
        tl.fromTo(art.querySelectorAll('[data-drop]'), { y: -50, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8, ease: 'bounce.out' }, 0.5);
        tl.fromTo(art.querySelectorAll('[data-fill]'), { scaleY: 0, transformOrigin: '50% 100%' }, { scaleY: 1, duration: 0.9, ease: 'power3.out' }, 0.5);
        tl.fromTo(art.querySelectorAll('[data-dock]'), { x: 60, opacity: 0 }, { x: 0, opacity: 1, duration: 0.7, ease: 'power3.out' }, 0.6);
        tl.fromTo(art.querySelectorAll('[data-dots]'), { opacity: 0, letterSpacing: '0.6em' }, { opacity: 1, letterSpacing: '0em', duration: 0.6 }, 0.7);
      });

      gsap.fromTo('.setup-section', { y: 40, opacity: 0 }, {
        y: 0,
        opacity: 1,
        duration: 1,
        ease: 'expo.out',
        stagger: 0.1,
        scrollTrigger: { trigger: '.setup-section', start: 'top 85%', once: true },
      });
      return setupOrbitRail(true);
    });
    mm.add('(prefers-reduced-motion: reduce)', () => setupOrbitRail(false));

    document.fonts?.ready.then(() => ScrollTrigger.refresh());
    return () => mm.revert();
  }, []);

  return null;
}
