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

// Later scenes start their cosmos tweens just after 0: a scrubbed timeline
// renders anything at exactly 0 on every refresh, which would let a scene
// further down overwrite the hero's state at load.
const START = 0.01;

const show = { opacity: 1, y: 0, duration: 0.18, ease: 'power2.out' };
const hide = { opacity: 0, y: -36, duration: 0.18, ease: 'power2.in' };

const scene = (name: string) => document.querySelector<HTMLElement>(`[data-scene="${name}"]`);
const within = (name: string, selector: string) => gsap.utils.toArray<HTMLElement>(`[data-scene="${name}"] ${selector}`);

function pinned(name: string, length: string) {
  return gsap.timeline({
    defaults: { ease: 'none' },
    scrollTrigger: { trigger: scene(name), start: 'top top', end: `+=${length}`, pin: true, scrub: 0.8 },
  });
}

/**
 * Chapter orbit. The ring sits on a chapter's star when that chapter starts
 * and drifts toward the next one as you read, so the line it draws is how far
 * through the story you are. Created after the pins so positions include pin
 * spacing.
 */
function setupRail(motion: boolean) {
  const sections = gsap.utils.toArray<HTMLElement>('[data-chapter]');
  const chapters = sections.map((section) => {
    const trigger = section.parentElement?.classList.contains('pin-spacer') ? section.parentElement : section;
    return {
      link: document.querySelector<HTMLElement>(`[data-rail="${section.dataset.chapter}"]`),
      dot: document.querySelector<HTMLElement>(`[data-rail-dot="${section.dataset.chapter}"]`),
      st: ScrollTrigger.create({ trigger, start: 'top center', end: 'bottom center' }),
    };
  });
  const orbits = gsap.utils.toArray<HTMLElement>('[data-orbit]');
  const tag = document.querySelector<HTMLElement>('[data-orbit-tag]');
  const num = document.querySelector<HTMLElement>('[data-orbit-num]');
  const label = document.querySelector<HTMLElement>('[data-orbit-label]');
  const count = document.querySelector<HTMLElement>('[data-orbit-count]');
  const last = Math.max(chapters.length - 1, 1);
  let active = -1;

  const update = (y: number) => {
    let index = 0;
    while (index < chapters.length - 1 && y >= chapters[index + 1].st.start) index++;
    const { start, end } = chapters[index].st;
    const within = gsap.utils.clamp(0, 1, (y - start) / Math.max(end - start, 1));
    const ship = gsap.utils.clamp(0, 1, (index + within) / last);
    orbits.forEach((orbit) => orbit.style.setProperty('--ship', ship.toFixed(4)));
    if (index === active) return;
    active = index;
    chapters.forEach(({ link, dot }, i) => {
      for (const el of [link, dot]) {
        el?.classList.toggle('is-active', i === index);
        el?.classList.toggle('is-past', i < index);
      }
      if (i === index) link?.setAttribute('aria-current', 'step');
      else link?.removeAttribute('aria-current');
    });
    const text = String(index + 1).padStart(2, '0');
    if (num) num.textContent = text;
    if (count) count.textContent = text;
    if (label) label.textContent = chapters[index].link?.textContent ?? '';
    if (motion && tag) gsap.fromTo(tag, { yPercent: 70, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.6, ease: 'expo.out', overwrite: true });
  };

  ScrollTrigger.create({
    start: 0,
    end: 'max',
    onUpdate: (self) => update(self.scroll()),
    onRefresh: (self) => update(self.scroll()),
  });
  update(window.scrollY);
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
      if (!motion) {
        setupRail(false);
        return;
      }

      // Intro: the eclipse settles in, then the headline rises out of its masks.
      gsap.fromTo(cosmos, { eclipseScale: 0.7, stars: 0 }, { eclipseScale: 1, stars: 1, duration: 2.8, ease: 'expo.out' });
      gsap.fromTo('[data-hero-char]', { yPercent: 115 }, { yPercent: 0, duration: 1.2, ease: 'expo.out', stagger: 0.03, delay: 0.35 });
      gsap.fromTo('[data-hero-fade]', { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: 1.1, ease: 'expo.out', stagger: 0.12, delay: 0.85 });
      gsap.fromTo('[data-scroll-cue]', { opacity: 0 }, { opacity: 1, duration: 1, delay: 1.8 });
      gsap.fromTo('[data-orbit]', { opacity: 0 }, { opacity: 1, duration: 1.4, delay: 1.6 });

      // Intro → into the ring: the eclipse grows past the screen, a flash, and we are through.
      pinned('hero', '130%')
        .to('[data-scroll-cue]', { opacity: 0, duration: 0.1 }, 0)
        .to('[data-hero]', { opacity: 0, y: -80, scale: 0.96, duration: 0.45 }, 0)
        .fromTo(cosmos, { eclipseScale: 1, travel: 0 }, { eclipseScale: 16, travel: 3, duration: 1, ease: 'power2.in', immediateRender: false }, 0)
        .fromTo(cosmos, { flash: 0 }, { flash: 0.45, duration: 0.16, immediateRender: false }, 0.72)
        .to(cosmos, { flash: 0, eclipse: 0, duration: 0.2 }, 0.88);

      // Price: quiet stars behind two statements and the quote from the docs.
      const priceBeats = within('price', '[data-beat]');
      gsap.set(priceBeats, { opacity: 0, y: 36 });
      pinned('price', '220%')
        .fromTo(cosmos, { stars: 1, travel: 3 }, { stars: 0.55, travel: 4, duration: 2.1, immediateRender: false }, START)
        .to(priceBeats[0], show, 0.15)
        .to(priceBeats[0], hide, 0.95)
        .to(priceBeats[1], show, 1.05);

      // Models: warp into a galaxy of real models, then sort it by kind. As each
      // cluster forms, the labs behind it drift out of it and settle beneath.
      const modelBeats = within('catalog', '[data-beat]');
      const kinds = gsap.utils.toArray<HTMLElement>('[data-kind]');
      gsap.set(modelBeats, { opacity: 0, y: 36 });
      gsap.set('[data-kinds]', { opacity: 1 });
      gsap.set('.kind-label', { opacity: 0, y: 12 });
      gsap.set('[data-kind-logo]', { opacity: 0, y: desktop ? -150 : -110, scale: 0.2 });
      const models = pinned('catalog', kinds.length ? '330%' : '280%')
        .fromTo(cosmos, { stars: 0.55, travel: 4 }, { stars: 1, travel: 13, duration: 1, ease: 'power2.inOut', immediateRender: false }, START)
        .fromTo(cosmos, { points: 0 }, { points: 1, duration: 0.4, immediateRender: false }, 0.6)
        .to(modelBeats[0], show, 0.85)
        .to(modelBeats[0], hide, 1.45)
        .fromTo(cosmos, { morph: 0, pointsY: 0.15 }, { morph: 2, pointsY: sortedY, duration: 0.8, immediateRender: false }, 1.5)
        .to('.kind-label', { opacity: 1, y: 0, duration: 0.2, stagger: 0.08 }, 2.05)
        .to(modelBeats[modelBeats.length - 1], show, 2.1);
      kinds.forEach((kind, k) => {
        models.to(
          kind.querySelectorAll('[data-kind-logo]'),
          { opacity: 1, y: 0, scale: 1, duration: 0.3, ease: 'back.out(1.6)', stagger: 0.035 },
          2.15 + k * 0.12,
        );
      });
      models.to({}, { duration: 0.6 });

      // How it works: four sentences light up word by word over a stream through the ring.
      const howBeats = within('how', '[data-beat]');
      gsap.set(howBeats, { opacity: 0, y: 36 });
      const how = pinned('how', `${howBeats.length * 95}%`).fromTo(
        cosmos,
        { morph: 2, pointsY: sortedY },
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

      // What it does: one tool at a time. The galaxy steps back so text stays crisp.
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

      // Paying and Open source: a headline, then each point arrives in turn.
      const columns = (name: string, from: Partial<typeof cosmos>, to: Partial<typeof cosmos>) => {
        const title = within(name, '[data-col-title]');
        const cols = within(name, '[data-col]');
        gsap.set([...title, ...cols], { opacity: 0, y: 30 });
        const tl = pinned(name, '170%')
          .fromTo(cosmos, from, { ...to, duration: 0.3, immediateRender: false }, START)
          .to(title, show, 0.05);
        cols.forEach((col, i) => tl.to(col, show, 0.35 + i * 0.3));
        tl.to({}, { duration: 0.4 });
      };
      columns('paying', { points: 0.1, stars: 0.65 }, { points: 0, stars: 0.55 });
      columns('open', { stars: 0.55 }, { stars: 0.5 });

      // Safety: one paragraph, lit word by word.
      const keyWords = gsap.utils.toArray<HTMLElement>('[data-words] [data-word]');
      gsap.set(keyWords, { opacity: 0.16 });
      pinned('keys', '170%')
        .fromTo(cosmos, { stars: 0.5 }, { stars: 0.4, duration: 0.3, immediateRender: false }, START)
        .to(keyWords, { opacity: 1, duration: 0.05, stagger: 0.9 / Math.max(keyWords.length, 1) }, 0.1)
        .to({}, { duration: 0.2 });

      // Get started: a planet horizon rises under the final call to action.
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

      setupRail(true);

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
