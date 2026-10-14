'use client';

import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useEffect } from 'react';
import { cosmos } from '../cosmos/store';
import { howFilm } from './film/how-motion';
import { hide, pinned, scene, show, START, within, type Tl } from './film/kit';
import { openFilm } from './film/open-motion';
import { payingFilm } from './film/paying-motion';
import { priceFilm } from './film/price-motion';
import { safetyFilm } from './film/safety-motion';
import { toolsFilm } from './film/tools-motion';
import { setupOrbitRail } from './orbit-rail';

// The whole story's choreography. Markup is server-rendered and reads fine
// without JavaScript or with reduced motion (every drawing rests in its
// finished state); this island turns each chapter into a short film. Each
// scene is pinned and scrubbed, so time is scroll: the WebGL cosmos plays
// behind, and the SVG motion graphics in ./film play in front.

/** A broken drawing must never take the page down with it: the captions still play. */
function safely(film: () => void) {
  try {
    film();
  } catch (error) {
    console.error(error);
  }
}

export function LandingMotion() {
  useEffect(() => {
    const mm = gsap.matchMedia();

    mm.add({ motion: '(prefers-reduced-motion: no-preference)', desktop: '(min-width: 900px)' }, (context) => {
      const { motion, desktop } = context.conditions as { motion: boolean; desktop: boolean };
      const baseScale = desktop ? 0.62 : 0.85;
      const sortedY = desktop ? 0.14 : 0.2;
      Object.assign(cosmos, {
        travel: 0,
        stars: 1,
        dust: 1,
        eclipse: 1,
        eclipseScale: 1,
        eclipseY: 0.26,
        horizon: 0,
        horizonLift: 0,
        flash: 0,
        points: 0,
        morph: 0,
        pointsX: 0,
        pointsY: 0.15,
        pointsScale: baseScale,
      });
      if (!motion) return setupOrbitRail(false);

      // Intro: the eclipse settles in and the headline assembles out of star dust.
      // Scripts are running, so the CSS fallback that reveals the hero after 3s
      // must not take over (animations beat inline styles in the cascade).
      gsap.set('[data-hero-char], [data-hero-fade]', { animation: 'none' });
      const assembled = { opacity: 1, x: 0, y: 0, rotation: 0, scale: 1, filter: 'blur(0px)' };
      const intro = gsap
        .timeline()
        .fromTo(cosmos, { eclipseScale: 0.7, stars: 0 }, { eclipseScale: 1, stars: 1, duration: 2.8, ease: 'expo.out' }, 0)
        .fromTo(
          '[data-hero-char]',
          {
            opacity: 0,
            x: () => gsap.utils.random(-320, 320),
            y: () => gsap.utils.random(-220, 220),
            rotation: () => gsap.utils.random(-120, 120),
            scale: () => gsap.utils.random(0.2, 2.4),
            filter: 'blur(14px)',
          },
          { ...assembled, duration: 1.8, ease: 'expo.out', stagger: { each: 0.03, from: 'random' } },
          0.3,
        )
        .fromTo('[data-hero-fade]', { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: 1.1, ease: 'expo.out', stagger: 0.12 }, 1.4)
        .fromTo('[data-orbit]', { opacity: 0 }, { opacity: 1, duration: 1.4 }, 1.6)
        .fromTo('[data-scroll-cue]', { opacity: 0 }, { opacity: 1, duration: 1 }, 2.2);
      // The intro is time-based and the exit is scroll-based; they share the
      // letters. The moment the reader scrolls, the intro jumps to its end so
      // the two never fight, and scrolling back up always lands on a whole headline.
      if (window.scrollY > 0) intro.progress(1);
      ScrollTrigger.create({ start: 1, end: 'max', onEnter: () => intro.progress(1) });

      // Intro → into the ring: the headline scatters back into dust as the eclipse grows past the screen.
      pinned('hero', '130%')
        .fromTo('[data-scroll-cue]', { opacity: 1 }, { opacity: 0, duration: 0.1, immediateRender: false }, 0)
        .fromTo(
          '[data-hero-char]',
          assembled,
          { y: () => gsap.utils.random(-160, -40), opacity: 0, filter: 'blur(8px)', duration: 0.4, stagger: { each: 0.008, from: 'center' }, immediateRender: false },
          0,
        )
        .fromTo('[data-hero-fade]', { opacity: 1, y: 0 }, { opacity: 0, y: -40, duration: 0.3, immediateRender: false }, 0)
        .fromTo(cosmos, { eclipseScale: 1, travel: 0 }, { eclipseScale: 16, travel: 3, duration: 1, ease: 'power2.in', immediateRender: false }, 0)
        .fromTo(cosmos, { flash: 0 }, { flash: 0.45, duration: 0.16, immediateRender: false }, 0.72)
        .to(cosmos, { flash: 0, eclipse: 0, duration: 0.2 }, 0.88);

      // The model points belong to two scenes: the catalog lights them, How it
      // works puts them out. Each owns a copy and the scene on screen hands its
      // copy over every frame, so a scene below that rewinds while you scroll
      // up can never switch them back on over the price receipt.
      const owners: { tl: Tl; state: { points: number } }[] = [];
      const ownPoints = (tl: Tl, from: number, to: number, at: number, duration: number) => {
        const state = { points: from };
        owners.push({ tl, state });
        tl.fromTo(state, { points: from }, { points: to, duration, immediateRender: false }, at);
      };
      const handOver = () => {
        let points = 0;
        for (const { tl, state } of owners) if (tl.scrollTrigger && window.scrollY >= tl.scrollTrigger.start) points = state.points;
        cosmos.points = points;
      };

      // Price: a receipt where the extras shatter.
      const priceBeats = within('price', '[data-beat]');
      gsap.set(priceBeats, { opacity: 0, y: 36 });
      const price = pinned('price', '230%')
        .fromTo(cosmos, { stars: 1, travel: 3 }, { stars: 0.55, travel: 4, duration: 2.1, immediateRender: false }, START)
        .to(priceBeats[0], show, 0.15)
        .to(priceBeats[0], hide, 0.95)
        .to(priceBeats[1], show, 1.05);
      safely(() => priceFilm(price));
      price.to({}, { duration: 0.2 }, 2.1);

      // Models: warp into a galaxy of real models, then sort it by kind. As each
      // cluster forms, the labs behind it drift out of it and settle beneath.
      const modelBeats = within('catalog', '[data-beat]');
      const kinds = gsap.utils.toArray<HTMLElement>('[data-kind]');
      gsap.set(modelBeats, { opacity: 0, y: 36 });
      gsap.set('.kind-label', { opacity: 0, y: 12 });
      gsap.set('[data-kind-logo]', { opacity: 0, y: desktop ? -150 : -110, scale: 0.2 });
      const models = pinned('catalog', kinds.length ? '330%' : '280%')
        .fromTo(cosmos, { stars: 0.55, travel: 4 }, { stars: 1, travel: 13, duration: 1, ease: 'power2.inOut', immediateRender: false }, START)
        .to(modelBeats[0], show, 0.85)
        .to(modelBeats[0], hide, 1.45)
        .fromTo(cosmos, { morph: 0, pointsY: 0.15 }, { morph: 2, pointsY: sortedY, duration: 0.8, immediateRender: false }, 1.5)
        .to('.kind-label', { opacity: 1, y: 0, duration: 0.2, stagger: 0.08 }, 2.05)
        .to(modelBeats[modelBeats.length - 1], show, 2.1);
      ownPoints(models, 0, 1, 0.6, 0.4);
      kinds.forEach((kind, k) => {
        models.to(kind.querySelectorAll('[data-kind-logo]'), { opacity: 1, y: 0, scale: 1, duration: 0.3, ease: 'back.out(1.6)', stagger: 0.035 }, 2.15 + k * 0.12);
      });
      models.to({}, { duration: 0.6 });

      // How it works: one request's journey, four captions lit word by word.
      const howBeats = within('how', '[data-beat]');
      gsap.set(howBeats, { opacity: 0, y: 36 });
      const how = pinned('how', `${howBeats.length * 100}%`).fromTo(
        cosmos,
        { morph: 2, pointsY: sortedY, stars: 1 },
        { morph: 1, pointsY: desktop ? 0.22 : 0.26, stars: 0.6, duration: 0.5, immediateRender: false },
        START,
      );
      ownPoints(how, 1, 0, START, 0.4);
      howBeats.forEach((beat, i) => {
        const t = 0.5 + i * 1.05;
        const words = beat.querySelectorAll('[data-word]');
        const sub = beat.querySelector('.beat-sub');
        gsap.set(words, { opacity: 0.16 });
        gsap.set(sub, { opacity: 0 });
        how.to(beat, show, t).to(words, { opacity: 1, duration: 0.12, stagger: 0.07 }, t + 0.08).to(sub, { opacity: 1, duration: 0.2 }, t + 0.4);
        if (i < howBeats.length - 1) how.to(beat, hide, t + 0.9);
      });
      safely(() => howFilm(how));

      // What it does: the orbit turns one tool to the front at a time.
      const tools = gsap.utils.toArray<HTMLElement>('[data-tool]');
      const ticks = gsap.utils.toArray<HTMLElement>('[data-tick]');
      gsap.set(tools.slice(1), { opacity: 0, y: 40 });
      gsap.set(ticks.slice(1), { opacity: 0.25 });
      const toolsTl = pinned('tools', `${tools.length * 90}%`)
        .fromTo(cosmos, { stars: 0.6 }, { stars: 0.55, duration: 0.4, immediateRender: false }, START)
        .fromTo(cosmos, { travel: 13 }, { travel: 14, duration: tools.length, immediateRender: false }, START);
      tools.forEach((tool, i) => {
        if (i === 0) return;
        toolsTl.to(tools[i - 1], hide, i - 0.2).to(tool, show, i).to(ticks[i], { opacity: 1, duration: 0.1 }, i);
      });
      safely(() => toolsFilm(toolsTl, tools.length));
      toolsTl.to({}, { duration: 0.2 }, tools.length);

      // Paying and Open source: a standing headline, then one point at a time.
      const chapter = (name: string, first: number, stars: [number, number]) => {
        const heading = within(name, '[data-heading]');
        const beats = within(name, '[data-beat]');
        gsap.set([...heading, ...beats], { opacity: 0, y: 30 });
        const tl = pinned(name, `${beats.length * 85 + first * 80}%`)
          .fromTo(cosmos, { stars: stars[0] }, { stars: stars[1], duration: 0.3, immediateRender: false }, START)
          .to(heading, show, 0.05);
        beats.forEach((beat, i) => {
          const t = first + i;
          if (i > 0) tl.to(beats[i - 1], hide, t - 0.25);
          tl.to(beat, show, t);
        });
        tl.to({}, { duration: 0.5 }, first + beats.length - 0.5);
        return tl;
      };
      safely(() => payingFilm(chapter('paying', 0.45, [0.55, 0.5])));
      safely(() => openFilm(chapter('open', 1.05, [0.5, 0.5])));

      // Safety: one paragraph, lit word by word, while the drawing locks things down.
      const keyWords = gsap.utils.toArray<HTMLElement>('[data-words] [data-word]');
      gsap.set(keyWords, { opacity: 0.16 });
      const keys = pinned('keys', '200%')
        .fromTo(cosmos, { stars: 0.5 }, { stars: 0.4, duration: 0.3, immediateRender: false }, START)
        .to(keyWords, { opacity: 1, duration: 0.05, stagger: 0.9 / Math.max(keyWords.length, 1) }, 0.1)
        .to({}, { duration: 0.2 });
      safely(() => safetyFilm(keys));

      // Get started: a planet horizon rises, and the three moves join into a constellation.
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
      gsap.fromTo('.moves', { '--line': 0 }, { '--line': 1, ease: 'none', scrollTrigger: { trigger: '.moves', start: 'top 85%', end: 'top 45%', scrub: true } });
      gsap.utils.toArray<HTMLElement>('[data-reveal]').forEach((el) => {
        gsap.fromTo(
          el,
          { y: 40, opacity: 0 },
          { y: 0, opacity: 1, duration: 1, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 88%', once: true } },
        );
      });

      const cleanups: (() => void)[] = [setupOrbitRail(true)];
      gsap.ticker.add(handOver);
      cleanups.push(() => gsap.ticker.remove(handOver));

      // Primary buttons lean toward the cursor.
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
