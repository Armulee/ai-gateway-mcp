'use client';

import { gsap } from 'gsap';
import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin';
import { MotionPathPlugin } from 'gsap/MotionPathPlugin';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useEffect } from 'react';
import { setupOrbitRail } from '../orbit/orbit-rail';

gsap.registerPlugin(ScrollTrigger, DrawSVGPlugin, MotionPathPlugin);

// The setup page is a guide to read and act on, so nothing is pinned: the
// overview arch is built stone by stone on load and leans toward the pointer,
// each step plays its little film once as it arrives, and the rail on the
// right tracks (and scrolls) the steps. With reduced motion everything simply
// rests finished.

export function SetupMotion() {
  useEffect(() => {
    const mm = gsap.matchMedia();
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      // Overview: the arch is built stone by stone, in step order, each one
      // dropping in from above and settling; then the point of light appears,
      // and if every stone is set, a beam shoots through the arch.
      const intro = gsap.timeline({ delay: 0.15 });
      intro
        .fromTo(
          '.setup-hero [data-stone]',
          { y: -90, opacity: 0, rotation: () => gsap.utils.random(-14, 14), transformOrigin: '50% 50%' },
          { y: 0, opacity: 1, rotation: 0, duration: 1, ease: 'bounce.out', stagger: 0.13 },
          0,
        )
        .fromTo('.progress-copy > *', { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: 1, ease: 'expo.out', stagger: 0.1 }, 0.2)
        .fromTo('.setup-hero [data-arch-point]', { opacity: 0, scale: 0.3, transformOrigin: '50% 50%' }, { opacity: 1, scale: 1, duration: 0.8, ease: 'back.out(2.5)' }, 1.2)
        .fromTo('.setup-hero [data-arch-beam]', { scaleY: 0, transformOrigin: '50% 50%' }, { scaleY: 1, duration: 0.9, ease: 'power3.out' }, 1.5);
      // The point waits in the arch, rising and settling like something breathing.
      gsap.to('.setup-hero [data-arch-point] circle', { y: -7, duration: 2.6, ease: 'sine.inOut', yoyo: true, repeat: -1, delay: 2 });

      // The arch leans toward the pointer, a little, in 3D.
      const arch = document.querySelector<SVGSVGElement>('.setup-hero [data-arch]');
      const hero = document.querySelector<HTMLElement>('.setup-hero');
      const cleanups: (() => void)[] = [];
      if (arch && hero && window.matchMedia('(pointer: fine)').matches) {
        gsap.set(arch, { transformPerspective: 900 });
        const turnY = gsap.quickTo(arch, 'rotationY', { duration: 0.9, ease: 'power3.out' });
        const turnX = gsap.quickTo(arch, 'rotationX', { duration: 0.9, ease: 'power3.out' });
        const move = (e: PointerEvent) => {
          turnY(((e.clientX / window.innerWidth) * 2 - 1) * 12);
          turnX(((e.clientY / window.innerHeight) * 2 - 1) * -8);
        };
        const leave = () => {
          turnY(0);
          turnX(0);
        };
        hero.addEventListener('pointermove', move);
        hero.addEventListener('pointerleave', leave);
        cleanups.push(() => {
          hero.removeEventListener('pointermove', move);
          hero.removeEventListener('pointerleave', leave);
        });
      }

      // Each step: its copy rises, its drawing draws itself, its star travels.
      gsap.utils.toArray<HTMLElement>('.guide-step').forEach((step) => {
        const art = step.querySelector<SVGSVGElement>('.step-art');
        const tl = gsap.timeline({ scrollTrigger: { trigger: step, start: 'top 80%', toggleActions: 'play none none none' } });
        tl.fromTo(step.querySelector('.step-card'), { y: 40, opacity: 0, scale: 0.97 }, { y: 0, opacity: 1, scale: 1, duration: 1, ease: 'expo.out', clearProps: 'transform' }, 0);
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
        tl.fromTo(art.querySelectorAll('[data-dock]'), { x: 60, opacity: 0 }, { x: 0, opacity: 1, duration: 0.7, ease: 'power3.out' }, 0.6);
        tl.fromTo(art.querySelectorAll('[data-dots]'), { opacity: 0, letterSpacing: '0.6em' }, { opacity: 1, letterSpacing: '0em', duration: 0.6 }, 0.7);
      });

      // Keep it safe: each statement lights up word by word as it crosses the
      // screen, and its plain sentence follows. clamp() lets the last ones
      // finish at the bottom of the page, which they could never scroll past.
      gsap.utils.toArray<HTMLElement>('[data-rule]').forEach((rule) => {
        gsap.fromTo(
          rule.querySelectorAll('[data-rule-word]'),
          { opacity: 0.14 },
          { opacity: 1, stagger: 0.12, ease: 'none', scrollTrigger: { trigger: rule, start: 'clamp(top 85%)', end: 'clamp(top 45%)', scrub: 0.6 } },
        );
        gsap.fromTo(
          rule.querySelector('[data-rule-detail]'),
          { opacity: 0, y: 16 },
          { opacity: 1, y: 0, duration: 0.8, ease: 'expo.out', scrollTrigger: { trigger: rule, start: 'clamp(top 55%)', toggleActions: 'play none none reverse' } },
        );
      });

      gsap.fromTo('.setup-section', { y: 40, opacity: 0 }, {
        y: 0,
        opacity: 1,
        duration: 1,
        ease: 'expo.out',
        stagger: 0.1,
        scrollTrigger: { trigger: '.setup-section', start: 'top 85%', toggleActions: 'play none none none' },
      });
      cleanups.push(setupOrbitRail(true));
      return () => cleanups.forEach((fn) => fn());
    });
    mm.add('(prefers-reduced-motion: reduce)', () => setupOrbitRail(false));

    document.fonts?.ready.then(() => ScrollTrigger.refresh());

    // Usage loads after the page, steps open and close: whenever the page's
    // height changes, measure again, so the rail's stars and every trigger
    // match the page as it is now.
    let timer: ReturnType<typeof setTimeout> | undefined;
    let height = document.documentElement.scrollHeight;
    const resized = new ResizeObserver(() => {
      const now = document.documentElement.scrollHeight;
      if (now === height) return;
      height = now;
      clearTimeout(timer);
      timer = setTimeout(() => ScrollTrigger.refresh(), 150);
    });
    const main = document.querySelector('main.setup');
    if (main) resized.observe(main);

    return () => {
      resized.disconnect();
      clearTimeout(timer);
      mm.revert();
    };
  }, []);

  return null;
}
