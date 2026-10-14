'use client';

import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useEffect } from 'react';
import { cosmos } from '../cosmos/store';

gsap.registerPlugin(ScrollTrigger);

// The whole story's choreography. Markup is server-rendered and reads fine
// without JavaScript or with reduced motion; this island only adds the scroll
// scenes. Each scene is pinned and scrubbed, and hands the cosmos to the next
// one in order (every tween on `cosmos` starts from where the last one ended).

const scene = (name: string) => document.querySelector<HTMLElement>(`[data-scene="${name}"]`);

function pinned(name: string, length: string) {
  return gsap.timeline({
    defaults: { ease: 'none' },
    scrollTrigger: { trigger: scene(name), start: 'top top', end: `+=${length}`, pin: true, scrub: 0.8 },
  });
}

// Later scenes start their cosmos tweens just after 0: a scrubbed timeline
// renders anything at exactly 0 on every refresh, which would let a scene
// further down overwrite the hero's state at load.
const START = 0.01;

const show = { opacity: 1, y: 0, duration: 0.18, ease: 'power2.out' };
const hide = { opacity: 0, y: -36, duration: 0.18, ease: 'power2.in' };

export function LandingMotion() {
  useEffect(() => {
    const mm = gsap.matchMedia();

    mm.add({ motion: '(prefers-reduced-motion: no-preference)', desktop: '(min-width: 900px)' }, (context) => {
      const { motion, desktop } = context.conditions as { motion: boolean; desktop: boolean };
      Object.assign(cosmos, {
        travel: 0,
        stars: 1,
        dust: 1,
        eclipse: 1,
        eclipseScale: 1,
        eclipseY: desktop ? 0.2 : 0.22,
        horizon: 0,
        horizonLift: 0,
        flash: 0,
        points: 0,
        morph: 0,
        pointsX: 0,
        pointsY: 0.15,
        pointsScale: desktop ? 0.62 : 0.85,
      });
      if (!motion) return;

      // Intro: the eclipse settles in, then the headline rises out of its masks.
      gsap.fromTo(cosmos, { eclipseScale: 0.7, stars: 0 }, { eclipseScale: 1, stars: 1, duration: 2.8, ease: 'expo.out' });
      gsap.fromTo(
        '[data-hero-char]',
        { yPercent: 115 },
        { yPercent: 0, duration: 1.2, ease: 'expo.out', stagger: 0.03, delay: 0.35 },
      );
      gsap.fromTo('[data-hero-fade]', { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: 1.1, ease: 'expo.out', stagger: 0.12, delay: 0.85 });

      // 1. Into the ring: the eclipse grows past the screen, a flash, and we are through.
      pinned('hero', '130%')
        .to('[data-hero]', { opacity: 0, y: -80, scale: 0.96, duration: 0.45 }, 0)
        .fromTo(cosmos, { eclipseScale: 1, travel: 0 }, { eclipseScale: 16, travel: 3, duration: 1, ease: 'power2.in', immediateRender: false }, 0)
        .fromTo(cosmos, { flash: 0 }, { flash: 0.45, duration: 0.16, immediateRender: false }, 0.72)
        .to(cosmos, { flash: 0, eclipse: 0, duration: 0.2 }, 0.88);

      // 2. Warp through the stars into a galaxy of models, then sort it by kind.
      const catalogBeats = gsap.utils.toArray<HTMLElement>('[data-scene="catalog"] [data-beat]');
      gsap.set(catalogBeats, { opacity: 0, y: 36 });
      gsap.set('[data-kinds]', { opacity: 0 });
      pinned('catalog', '280%')
        .fromTo(cosmos, { travel: 3 }, { travel: 13, duration: 1, ease: 'power2.inOut', immediateRender: false }, START)
        .fromTo(cosmos, { points: 0 }, { points: 1, duration: 0.4, immediateRender: false }, 0.6)
        .to(catalogBeats[0], show, 0.85)
        .to(catalogBeats[0], hide, 1.45)
        .fromTo(
          cosmos,
          { morph: 0, pointsY: 0.15 },
          { morph: 2, pointsY: desktop ? 0.14 : 0.2, duration: 0.8, immediateRender: false },
          1.5,
        )
        .to(catalogBeats[1], show, 2.1)
        .to('[data-kinds]', { opacity: 1, duration: 0.15 }, 2.15)
        .to({}, { duration: 0.5 });

      // 3. How it works: three sentences light up word by word over a stream through the ring.
      const howBeats = gsap.utils.toArray<HTMLElement>('[data-scene="how"] [data-beat]');
      gsap.set(howBeats, { opacity: 0, y: 36 });
      const how = pinned('how', '330%').fromTo(
        cosmos,
        { morph: 2, pointsY: desktop ? 0.14 : 0.2 },
        { morph: 1, pointsY: desktop ? 0.22 : 0.26, duration: 0.7, immediateRender: false },
        START,
      );
      howBeats.forEach((beat, i) => {
        const at = 0.5 + i * 1.05;
        const words = beat.querySelectorAll('[data-word]');
        const sub = beat.querySelector('.beat-sub');
        gsap.set(words, { opacity: 0.16 });
        gsap.set(sub, { opacity: 0 });
        how.to(beat, show, at).to(words, { opacity: 1, duration: 0.12, stagger: 0.07 }, at + 0.08).to(sub, { opacity: 1, duration: 0.2 }, at + 0.4);
        if (i < howBeats.length - 1) how.to(beat, hide, at + 0.9);
      });
      how.to({}, { duration: 0.4 });

      // 4. Tools, one at a time. The galaxy steps back so text stays crisp.
      const tools = gsap.utils.toArray<HTMLElement>('[data-tool]');
      const ticks = gsap.utils.toArray<HTMLElement>('[data-tick]');
      gsap.set(tools.slice(1), { opacity: 0, y: 40 });
      gsap.set(ticks.slice(1), { opacity: 0.25 });
      const toolsTl = pinned('tools', `${tools.length * 85}%`)
        .fromTo(cosmos, { points: 1, stars: 1 }, { points: 0.1, stars: 0.65, duration: 0.4, immediateRender: false }, START)
        .fromTo(cosmos, { travel: 13 }, { travel: 14, duration: tools.length, immediateRender: false }, START);
      tools.forEach((tool, i) => {
        if (i === 0) return;
        toolsTl.to(tools[i - 1], hide, i - 0.2).to(tool, show, i).to(ticks[i], { opacity: 1, duration: 0.1 }, i);
      });

      // 5. Security: one paragraph, lit word by word.
      const keyWords = gsap.utils.toArray<HTMLElement>('[data-words] [data-word]');
      gsap.set(keyWords, { opacity: 0.16 });
      pinned('keys', '170%')
        .fromTo(cosmos, { points: 0.1, stars: 0.65 }, { points: 0, stars: 0.4, duration: 0.3, immediateRender: false }, START)
        .to(keyWords, { opacity: 1, duration: 0.05, stagger: 0.9 / Math.max(keyWords.length, 1) }, 0.1)
        .to({}, { duration: 0.2 });

      // 6. A planet horizon rises under the final call to action.
      gsap.fromTo(
        cosmos,
        { horizon: 0, horizonLift: 0, stars: 0.4 },
        {
          horizon: 1,
          horizonLift: 1,
          stars: 0.8,
          ease: 'none',
          immediateRender: false,
          scrollTrigger: { trigger: scene('finale'), start: 'top bottom', end: 'top 15%', scrub: true },
        },
      );
      gsap.utils.toArray<HTMLElement>('[data-reveal]').forEach((el) => {
        gsap.fromTo(
          el,
          { y: 40, opacity: 0 },
          { y: 0, opacity: 1, duration: 1, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 88%', once: true } },
        );
      });

      // Primary buttons lean toward the cursor.
      const cleanups: (() => void)[] = [];
      if (window.matchMedia('(pointer: fine)').matches) {
        document.querySelectorAll<HTMLElement>('[data-magnetic]').forEach((el) => {
          const xTo = gsap.quickTo(el, 'x', { duration: 0.6, ease: 'power3.out' });
          const yTo = gsap.quickTo(el, 'y', { duration: 0.6, ease: 'power3.out' });
          const move = (e: PointerEvent) => {
            const r = el.getBoundingClientRect();
            xTo((e.clientX - (r.left + r.width / 2)) * 0.25);
            yTo((e.clientY - (r.top + r.height / 2)) * 0.35);
          };
          const leave = () => {
            xTo(0);
            yTo(0);
          };
          el.addEventListener('pointermove', move);
          el.addEventListener('pointerleave', leave);
          cleanups.push(() => {
            el.removeEventListener('pointermove', move);
            el.removeEventListener('pointerleave', leave);
          });
        });
      }
      return () => cleanups.forEach((fn) => fn());
    });

    // Web fonts change line heights; re-measure the pinned scenes once loaded.
    document.fonts?.ready.then(() => ScrollTrigger.refresh());
    return () => mm.revert();
  }, []);

  return null;
}
