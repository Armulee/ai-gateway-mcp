'use client';

import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useEffect } from 'react';
import { form, type FormName } from '../cosmos/shapes';
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
    scrollTrigger: { trigger: scene(name), start: 'top top', end: `+=${length}`, pin: true, scrub: 0.8, invalidateOnRefresh: true },
  });
}

type Place = { swarmX: number; swarmY: number; swarmScale: number };

/**
 * Where a scene's formation slot sits on screen while the scene is pinned, in
 * the swarm's units. Offsets ignore transforms, so a slot inside a block that
 * is mid-animation still reads its resting place.
 */
function place(name: string): Place {
  const pin = scene(name)?.querySelector<HTMLElement>('.scene-pin');
  const slot = scene(name)?.querySelector<HTMLElement>('[data-formation]');
  if (!pin || !slot) return { swarmX: 0, swarmY: 0.35, swarmScale: 0.3 };
  let x = 0;
  let y = 0;
  for (let el: HTMLElement | null = slot; el && el !== pin; el = el.offsetParent as HTMLElement | null) {
    x += el.offsetLeft;
    y += el.offsetTop;
  }
  x += pin.getBoundingClientRect().left;
  const size = Math.min(slot.offsetWidth, slot.offsetHeight);
  return {
    swarmX: ((x + slot.offsetWidth / 2) / window.innerWidth) * 2 - 1,
    swarmY: 1 - ((y + slot.offsetHeight / 2) / window.innerHeight) * 2,
    swarmScale: (size / window.innerHeight) * 0.92,
  };
}

/** A scene's slot as tween values, re-measured whenever ScrollTrigger refreshes. */
const at = (name: string) => ({
  swarmX: () => place(name).swarmX,
  swarmY: () => place(name).swarmY,
  swarmScale: () => place(name).swarmScale,
});

/** Values each scene owns outright (see `change` below). */
const OWNED = ['swarm', 'form', 'swarmX', 'swarmY', 'swarmScale', 'points'] as const;
type Owned = Record<(typeof OWNED)[number], number>;
type OwnedVars = Partial<Record<(typeof OWNED)[number], number | (() => number)>>;

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
        swarm: 0,
        form: 0,
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

      // The star swarm and the model points run through the whole story. Each
      // scene animates its own copy of their values, starting from where the
      // previous scene left them, and the scene you are in hands its copy to
      // the canvas every frame. A scene further down that rewinds while you
      // scroll back up can then never overwrite the one on screen.
      const intro: Owned = { swarm: 0, form: 0, swarmX: 0, swarmY: 0, swarmScale: 0.3, points: 0 };
      let carried: OwnedVars = { ...intro, ...at('price') };
      const owners = new Map<gsap.core.Timeline, Owned>();
      const change = (tl: gsap.core.Timeline, time: number, to: OwnedVars, duration = 0.45, ease = 'power2.inOut') => {
        let state = owners.get(tl);
        const first = !state;
        if (!state) owners.set(tl, (state = { ...intro }));
        const keys = first ? OWNED : (Object.keys(to) as (typeof OWNED)[number][]);
        const from = Object.fromEntries(keys.map((key) => [key, carried[key]]));
        tl.fromTo(state, from, { ...(first ? from : {}), ...to, duration, ease, immediateRender: first }, time);
        carried = { ...carried, ...to };
      };
      const shapeTo = (tl: gsap.core.Timeline, time: number, name: FormName) => change(tl, time, { form: form(name) }, 0.5);
      const handOver = () => {
        const y = window.scrollY;
        let state = intro;
        owners.forEach((owned, tl) => {
          if (tl.scrollTrigger && y >= tl.scrollTrigger.start) state = owned;
        });
        Object.assign(cosmos, state);
      };

      // Price: quiet stars behind two statements and the quote from the docs.
      // The stars form a price tag with a markup stuck on it; then the markup flies off.
      const priceBeats = within('price', '[data-beat]');
      gsap.set(priceBeats, { opacity: 0, y: 36 });
      const price = pinned('price', '220%')
        .fromTo(cosmos, { stars: 1, travel: 3 }, { stars: 0.55, travel: 4, duration: 2.1, immediateRender: false }, START)
        .to(priceBeats[0], show, 0.15)
        .to(priceBeats[0], hide, 0.95)
        .to(priceBeats[1], show, 1.05);
      change(price, START, { swarm: 1, form: form('tagMarkup'), ...at('price') }, 0.35);
      shapeTo(price, 0.95, 'tag');

      // Models: warp into a galaxy of real models, then sort it by kind. As each
      // cluster forms, the labs behind it drift out of it and settle beneath.
      const modelBeats = within('catalog', '[data-beat]');
      const kinds = gsap.utils.toArray<HTMLElement>('[data-kind]');
      gsap.set(modelBeats, { opacity: 0, y: 36 });
      gsap.set('[data-kinds]', { opacity: 1 });
      gsap.set('.kind-label', { opacity: 0, y: 12 });
      gsap.set('[data-kind-logo]', { opacity: 0, y: desktop ? -150 : -110, scale: 0.2 });
      const models = pinned('catalog', kinds.length ? '330%' : '280%');
      change(models, START, { swarm: 0, swarmScale: () => place('price').swarmScale * 2.2 }, 0.5);
      change(models, 0.6, { points: 1 }, 0.4, 'none');
      models
        .fromTo(cosmos, { stars: 0.55, travel: 4 }, { stars: 1, travel: 13, duration: 1, ease: 'power2.inOut', immediateRender: false }, START)
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
      // The models step back; the swarm draws each step: a plug, a chat, a link, the gateway.
      const how = pinned('how', `${howBeats.length * 95}%`).fromTo(
        cosmos,
        { morph: 2, pointsY: sortedY },
        { morph: 1, pointsY: desktop ? 0.22 : 0.26, duration: 0.5, immediateRender: false },
        START,
      );
      const howForms: FormName[] = ['plug', 'chat', 'link', 'hub'];
      change(how, START, { swarm: 1, points: 0, form: form('plug'), ...at('how') }, 0.6);
      howBeats.forEach((beat, i) => {
        const t = 0.5 + i * 1.05;
        if (i > 0) shapeTo(how, t - 0.3, howForms[i]);
        const words = beat.querySelectorAll('[data-word]');
        const sub = beat.querySelector('.beat-sub');
        gsap.set(words, { opacity: 0.16 });
        gsap.set(sub, { opacity: 0 });
        how.to(beat, show, t).to(words, { opacity: 1, duration: 0.12, stagger: 0.07 }, t + 0.08).to(sub, { opacity: 1, duration: 0.2 }, t + 0.4);
        if (i < howBeats.length - 1) how.to(beat, hide, t + 0.9);
      });
      how.to({}, { duration: 0.4 });

      // What it does: one tool at a time. The galaxy steps back so text stays crisp.
      const tools = gsap.utils.toArray<HTMLElement>('[data-tool]');
      const ticks = gsap.utils.toArray<HTMLElement>('[data-tick]');
      gsap.set(tools.slice(1), { opacity: 0, y: 40 });
      gsap.set(ticks.slice(1), { opacity: 0.25 });
      const toolsTl = pinned('tools', `${tools.length * 85}%`)
        .fromTo(cosmos, { stars: 1 }, { stars: 0.65, duration: 0.4, immediateRender: false }, START)
        .fromTo(cosmos, { travel: 13 }, { travel: 14, duration: tools.length, immediateRender: false }, START);
      const toolForms: FormName[] = ['search', 'lines', 'picture', 'clapper', 'download'];
      change(toolsTl, START, { form: form('search'), ...at('tools') }, 0.5);
      tools.forEach((tool, i) => {
        if (i === 0) return;
        toolsTl.to(tools[i - 1], hide, i - 0.2).to(tool, show, i).to(ticks[i], { opacity: 1, duration: 0.1 }, i);
        shapeTo(toolsTl, i - 0.3, toolForms[i]);
      });

      // Paying and Open source: a standing headline, then one point at a time,
      // each drawn by the swarm.
      const formed = (name: string, intro: FormName, beatForms: FormName[], stars: [number, number]) => {
        const heading = within(name, '[data-heading]');
        const beats = within(name, '[data-beat]');
        gsap.set([...heading, ...beats], { opacity: 0, y: 30 });
        const tl = pinned(name, `${beats.length * 80 + (intro === beatForms[0] ? 40 : 90)}%`)
          .fromTo(cosmos, { stars: stars[0] }, { stars: stars[1], duration: 0.3, immediateRender: false }, START)
          .to(heading, show, 0.05);
        change(tl, START, { form: form(intro), ...at(name) }, 0.5);
        // A shape of its own for the headline gets a moment before the first point.
        const first = intro === beatForms[0] ? 0.45 : 1.05;
        beats.forEach((beat, i) => {
          const t = first + i;
          if (i > 0) tl.to(beats[i - 1], hide, t - 0.25);
          if (beatForms[i] !== (i ? beatForms[i - 1] : intro)) shapeTo(tl, t - 0.3, beatForms[i]);
          tl.to(beat, show, t);
        });
        tl.to({}, { duration: 0.5 });
      };
      formed('paying', 'calendar', ['calendar', 'battery', 'gauge'], [0.65, 0.55]);
      formed('open', 'code', ['zero', 'fork', 'heart'], [0.55, 0.5]);

      // Safety: one paragraph, lit word by word, while a key turns into a lock.
      const keyWords = gsap.utils.toArray<HTMLElement>('[data-words] [data-word]');
      gsap.set(keyWords, { opacity: 0.16 });
      const keys = pinned('keys', '170%')
        .fromTo(cosmos, { stars: 0.5 }, { stars: 0.4, duration: 0.3, immediateRender: false }, START)
        .to(keyWords, { opacity: 1, duration: 0.05, stagger: 0.9 / Math.max(keyWords.length, 1) }, 0.1)
        .to({}, { duration: 0.2 });
      change(keys, START, { form: form('key'), ...at('keys') }, 0.4);
      shapeTo(keys, 0.5, 'lock');

      // Get started: a planet horizon rises under the final call to action, and the swarm fades to dust.
      const finale = gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: { trigger: scene('finale'), start: 'top bottom', end: 'top 15%', scrub: true, invalidateOnRefresh: true },
      });
      finale.fromTo(cosmos, { horizon: 0, horizonLift: 0, stars: 0.4 }, { horizon: 1, horizonLift: 1, stars: 0.8, duration: 1, immediateRender: false }, 0);
      change(finale, 0, { swarm: 0, swarmScale: () => place('keys').swarmScale * 1.8 }, 0.6, 'none');
      gsap.ticker.add(handOver);
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
      return () => {
        gsap.ticker.remove(handOver);
        cleanups.forEach((fn) => fn());
      };
    });

    // Web fonts change line heights; re-measure the pinned scenes once loaded.
    document.fonts?.ready.then(() => ScrollTrigger.refresh());
    return () => mm.revert();
  }, []);

  return null;
}
