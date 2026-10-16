'use client';

import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { useEffect } from 'react';

gsap.registerPlugin(ScrollTrigger);

let lenis: Lenis | undefined;

/** Scrolls to a pixel offset: instantly (for dragging) or smoothly. */
export function scrollToY(y: number, immediate = false) {
  if (lenis) lenis.scrollTo(y, { immediate });
  else window.scrollTo({ top: y, behavior: immediate ? 'instant' : 'smooth' });
}

/** Scrolls to an in-page anchor, smoothly when Lenis is running. */
export function scrollToHash(hash: string, offset = -16) {
  const target = document.querySelector<HTMLElement>(hash);
  if (!target) return;
  if (lenis) lenis.scrollTo(target, { offset });
  else target.scrollIntoView();
}

/** True when this page load is a reload (not a link followed or an address typed). */
export function isReload(): boolean {
  const entry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
  return entry?.type === 'reload';
}

/**
 * Lenis smooth scrolling, driven by GSAP's ticker so ScrollTrigger and the
 * WebGL scene share one animation frame. Off under prefers-reduced-motion.
 */
export function SmoothScroll() {
  useEffect(() => {
    // A reload starts at the top: no restored position, and no #section left
    // over from clicking the rail or the arch. Links followed to a section
    // (e.g. /?steps#connect) still land there.
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
    if (isReload()) {
      if (window.location.hash) history.replaceState(null, '', window.location.pathname + window.location.search);
      window.scrollTo(0, 0);
    }

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    lenis = new Lenis({ lerp: 0.1, wheelMultiplier: 0.9 });
    lenis.on('scroll', ScrollTrigger.update);
    const raf = (time: number) => lenis?.raf(time * 1000);
    gsap.ticker.add(raf);
    gsap.ticker.lagSmoothing(0);

    // Same-page anchors go through Lenis instead of jumping. Read the href
    // attribute: SVG links (the arch's stones) have no `.hash` property.
    const onClick = (event: MouseEvent) => {
      const hash = (event.target as Element | null)?.closest('a[href^="#"]')?.getAttribute('href');
      if (!hash || hash.length < 2) return;
      event.preventDefault();
      scrollToHash(hash);
      history.replaceState(null, '', hash);
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
