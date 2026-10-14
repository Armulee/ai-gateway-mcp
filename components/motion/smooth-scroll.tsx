'use client';

import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { useEffect } from 'react';

gsap.registerPlugin(ScrollTrigger);

let lenis: Lenis | undefined;

/** Scrolls to an in-page anchor, smoothly when Lenis is running. */
export function scrollToHash(hash: string) {
  const target = document.querySelector<HTMLElement>(hash);
  if (!target) return;
  if (lenis) lenis.scrollTo(target, { offset: -16 });
  else target.scrollIntoView();
}

/**
 * Lenis smooth scrolling, driven by GSAP's ticker so ScrollTrigger and the
 * WebGL scene share one animation frame. Off under prefers-reduced-motion.
 */
export function SmoothScroll() {
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    lenis = new Lenis({ lerp: 0.1, wheelMultiplier: 0.9 });
    lenis.on('scroll', ScrollTrigger.update);
    const raf = (time: number) => lenis?.raf(time * 1000);
    gsap.ticker.add(raf);
    gsap.ticker.lagSmoothing(0);

    // Same-page anchors go through Lenis instead of jumping.
    const onClick = (event: MouseEvent) => {
      const link = (event.target as Element | null)?.closest<HTMLAnchorElement>('a[href^="#"]');
      if (!link || link.hash.length < 2) return;
      event.preventDefault();
      scrollToHash(link.hash);
      history.replaceState(null, '', link.hash);
    };
    document.addEventListener('click', onClick);

    return () => {
      document.removeEventListener('click', onClick);
      gsap.ticker.remove(raf);
      lenis?.destroy();
      lenis = undefined;
    };
  }, []);

  return null;
}
