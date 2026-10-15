'use client';

import { gsap } from 'gsap';
import { useEffect, useRef } from 'react';
import { BrandMark } from '../brand-mark';
import { GatewayArch, settle, useStepStates, type StepView } from './steps';

// With the gateway open, the page opens on the brand: a point of light, the
// arch built outward from it, the arch shrinking into the mark as the name
// appears, and the whole lockup flying to its place in the nav. Then usage.
// The whole film plays the first time a browser opens the page; after that a
// short version (under two seconds): the mark alone flies to the nav and the
// name slides out beside it. A click anywhere (or a key, or a scroll) skips
// either. Without motion (or JavaScript, after a few seconds) it is not there.

export const INTRO_DONE = 'setup:intro-done';
const PLAYED = 'ai-gateway-mcp:intro-played';

/** The name in the lockup is the nav brand at up to this many times its size (less on narrow screens). */
const K = 3.2;

function finish(root: HTMLElement) {
  root.classList.add('is-done');
  try {
    localStorage.setItem(PLAYED, '1');
  } catch {
    // No storage: the whole film plays again next time.
  }
  window.dispatchEvent(new Event(INTRO_DONE));
  // Then the page rises in, starting with usage.
  if (document.documentElement.classList.contains('motion-ok')) {
    gsap.fromTo('.setup-section', { y: 40, opacity: 0 }, { y: 0, opacity: 1, duration: 1, ease: 'expo.out', stagger: 0.12 });
  }
}

export function OpenIntro({ steps }: { steps: StepView[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const states = settle(steps, useStepStates(steps));

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    if (!document.documentElement.classList.contains('motion-ok')) return finish(root);

    const arch = root.querySelector<SVGSVGElement>('[data-arch]')!;
    const lockup = root.querySelector<HTMLElement>('[data-open-lockup]')!;
    const mark = lockup.querySelector<SVGSVGElement>('.brand-mark')!;
    const name = lockup.querySelector<HTMLElement>('[data-open-name]')!;
    const target = document.querySelector<HTMLElement>('.nav .nav-brand');
    // Big, but never wider than most of the screen.
    const k = target ? Math.min(K, (window.innerWidth * 0.82) / target.getBoundingClientRect().width) : K;
    lockup.style.setProperty('--k', String(k));

    let played = false;
    try {
      played = localStorage.getItem(PLAYED) === '1';
    } catch {
      // No storage: play the whole film.
    }

    /** Flies the lockup onto the nav brand, from wherever it is now. */
    const flyToNav = (timeline: gsap.core.Timeline, at: number, duration: number) => {
      if (!target) return;
      timeline.to(
        lockup,
        {
          x: () => (gsap.getProperty(lockup, 'x') as number) + target.getBoundingClientRect().left - lockup.getBoundingClientRect().left,
          y: () => (gsap.getProperty(lockup, 'y') as number) + target.getBoundingClientRect().top - lockup.getBoundingClientRect().top,
          scale: 1 / k,
          transformOrigin: '0% 0%',
          duration,
          ease: 'power4.inOut',
        },
        at,
      );
    };

    let tl: gsap.core.Timeline | undefined;
    const ctx = gsap.context(() => {
      if (played) {
        // The short version: the mark pops up in the middle, flies to the
        // nav, and the nav's own name slides out beside it.
        gsap.set(root.querySelector('.open-stage'), { opacity: 0 });
        gsap.set(lockup, { opacity: 1 });
        gsap.set(name, { opacity: 0 });
        gsap.set(lockup, { x: window.innerWidth / 2 - center(mark).x });
        tl = gsap.timeline({
          onComplete: () => {
            finish(root);
            gsap.fromTo('.nav .nav-brand > span', { clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0% 0 0)', duration: 0.5, ease: 'expo.out' });
          },
        });
        tl.fromTo(mark, { opacity: 0, scale: 0.4, transformOrigin: '50% 50%' }, { opacity: 1, scale: 1, duration: 0.45, ease: 'back.out(2.2)' }, 0.05);
        flyToNav(tl, 0.55, 0.7);
        tl.to(root, { opacity: 0, duration: 0.12, ease: 'none' }, 1.25);
        return;
      }

      // The arch's own centre of growth: the point of light (see GatewayArch).
      const origin = '200 298';
      gsap.set(lockup, { opacity: 1 });
      gsap.set([mark, name], { opacity: 0 });
      gsap.set(name, { clipPath: 'inset(0 100% 0 0)' });

      tl = gsap.timeline({ defaults: { ease: 'expo.out' }, onComplete: () => finish(root) });

      // 1. A point of light.
      tl.fromTo(root.querySelector('[data-arch-point]'), { opacity: 0, scale: 0, svgOrigin: origin }, { opacity: 1, scale: 1, duration: 0.8, ease: 'back.out(2.4)' }, 0.2);
      // 2. The arch grows out of it, stone by stone.
      tl.fromTo(
        root.querySelectorAll('[data-stone]'),
        { opacity: 0, scale: 0.05, svgOrigin: origin },
        { opacity: 1, scale: 1, duration: 1.1, stagger: 0.07 },
        0.75,
      );
      tl.fromTo(root.querySelector('[data-arch-beam]'), { scaleY: 0, svgOrigin: '200 220' }, { scaleY: 1, duration: 0.7, ease: 'power3.out' }, 1.55);

      // 3. It shrinks into the mark, and the name slides out beside it.
      tl.to(
        arch,
        {
          x: () => center(mark).x - center(arch).x,
          y: () => center(mark).y - center(arch).y,
          scale: () => mark.getBoundingClientRect().height / arch.getBoundingClientRect().height,
          duration: 0.8,
          ease: 'power4.inOut',
        },
        2.25,
      );
      tl.to(arch, { opacity: 0, duration: 0.25, ease: 'none' }, 2.85);
      tl.to(mark, { opacity: 1, duration: 0.25, ease: 'none' }, 2.8);
      tl.to(name, { opacity: 1, clipPath: 'inset(0 0% 0 0)', duration: 0.8 }, 3.0);

      // 4. The lockup flies to the nav, where the real brand takes over.
      flyToNav(tl, 3.9, 0.9);
      tl.to(root, { opacity: 0, duration: 0.3, ease: 'none' }, 4.8);
    }, root);

    // Any click, key or scroll jumps to the end (which also finishes the intro).
    const onSkip = () => tl?.progress(1);
    window.addEventListener('pointerdown', onSkip, { once: true });
    window.addEventListener('keydown', onSkip, { once: true });
    window.addEventListener('wheel', onSkip, { once: true, passive: true });
    window.addEventListener('touchmove', onSkip, { once: true, passive: true });
    return () => {
      window.removeEventListener('pointerdown', onSkip);
      window.removeEventListener('keydown', onSkip);
      window.removeEventListener('wheel', onSkip);
      window.removeEventListener('touchmove', onSkip);
      ctx.revert();
    };
  }, []);

  return (
    <div ref={ref} className="open-intro" aria-hidden="true" inert data-open-intro>
      <div className="open-stage">
        <GatewayArch steps={steps} states={states} guide={false} />
      </div>
      {/* The nav brand at K times its size, so one uniform scale lands it in place. */}
      <div className="open-lockup" style={{ '--k': K } as React.CSSProperties} data-open-lockup>
        <BrandMark />
        <span data-open-name>AI Gateway MCP</span>
      </div>
    </div>
  );
}

function center(el: Element) {
  const box = el.getBoundingClientRect();
  return { x: box.left + box.width / 2, y: box.top + box.height / 2 };
}
