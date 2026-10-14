'use client';

import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useEffect } from 'react';
import { gate } from '../gate/store';

gsap.registerPlugin(ScrollTrigger);

// All landing-page choreography in one place. The markup is server-rendered and
// readable without JS; this island only adds motion on top. Every scroll tween
// on the shared `gate` object uses immediateRender: false so sections hand the
// scene to each other in order instead of fighting at load.

const scrub = (trigger: string, start: string, end: string) => ({
  scrollTrigger: { trigger, start, end, scrub: true },
  immediateRender: false,
  ease: 'none',
});

export function LandingMotion() {
  useEffect(() => {
    const mm = gsap.matchMedia();

    mm.add(
      { motion: '(prefers-reduced-motion: no-preference)', desktop: '(min-width: 900px)' },
      (context) => {
        const { motion, desktop } = context.conditions as { motion: boolean; desktop: boolean };
        const heroX = desktop ? 0.42 : 0;
        const heroY = desktop ? 0.02 : -0.42;
        Object.assign(gate, { offsetX: heroX, offsetY: heroY });
        if (!motion) return;

        // Hero: letters rise out of their masks, then the scene fades in behind.
        gsap.fromTo(
          '[data-hero-char]',
          { yPercent: 115, rotate: 8 },
          { yPercent: 0, rotate: 0, duration: 1.15, ease: 'expo.out', stagger: 0.028, delay: 0.1 },
        );
        gsap.fromTo(
          '[data-hero-fade]',
          { y: 28, opacity: 0 },
          { y: 0, opacity: 1, duration: 1.1, ease: 'expo.out', stagger: 0.12, delay: 0.55 },
        );
        gsap.fromTo(gate, { intensity: 0, scale: 0.55 }, { intensity: 1, scale: 0.86, duration: 2.4, ease: 'expo.out' });

        // Hero → flow: the scene slides to the centre.
        gsap.fromTo(gate, { offsetX: heroX, offsetY: heroY }, { offsetX: 0, offsetY: 0.04, ...scrub('[data-flow]', 'top bottom', 'top top') });

        // Flow: pinned story. Cloud → gate → sorted by kind.
        const flow = document.querySelector<HTMLElement>('[data-flow]');
        const steps = gsap.utils.toArray<HTMLElement>('[data-flow-step]');
        const ticks = gsap.utils.toArray<HTMLElement>('[data-flow-tick]');
        if (flow && steps.length === 3) {
          flow.classList.add('is-pinned');
          gsap.set(steps.slice(1), { opacity: 0, y: 40 });
          gsap.set(ticks.slice(1), { opacity: 0.25 });
          gsap.set('[data-flow-kinds]', { opacity: 0 });
          const tl = gsap.timeline({
            defaults: { ease: 'none' },
            scrollTrigger: { trigger: flow, start: 'top top', end: '+=300%', pin: true, scrub: 0.6 },
          });
          tl.fromTo(gate, { morph: 0 }, { morph: 1, duration: 0.8, immediateRender: false }, 0.2)
            .to(steps[0], { opacity: 0, y: -40, duration: 0.2 }, 0.75)
            .to(steps[1], { opacity: 1, y: 0, duration: 0.2 }, 0.9)
            .to(ticks[1], { opacity: 1, duration: 0.1 }, 0.9)
            .fromTo(gate, { morph: 1, offsetY: 0.04 }, { morph: 2, offsetY: desktop ? 0.3 : 0.25, duration: 0.8, immediateRender: false }, 1.2)
            .to(steps[1], { opacity: 0, y: -40, duration: 0.2 }, 1.75)
            .to(steps[2], { opacity: 1, y: 0, duration: 0.2 }, 1.9)
            .to(ticks[2], { opacity: 1, duration: 0.1 }, 1.9)
            .to('[data-flow-kinds]', { opacity: 1, duration: 0.2 }, 2)
            .to({}, { duration: 0.8 });
        }

        // Catalog: the clusters spread into a wall of models, dimmed behind the numbers.
        gsap.fromTo(
          gate,
          { morph: 2, intensity: 1, offsetY: desktop ? 0.3 : 0.25 },
          { morph: 3, intensity: 0.5, offsetY: 0, ...scrub('[data-catalog]', 'top bottom', 'top 25%') },
        );
        document.querySelectorAll<HTMLElement>('[data-count]').forEach((el) => {
          const target = Number(el.dataset.count);
          const counter = { v: 0 };
          gsap.to(counter, {
            v: target,
            duration: 1.6,
            ease: 'expo.out',
            scrollTrigger: { trigger: el, start: 'top 85%', once: true },
            onUpdate: () => {
              el.textContent = Math.round(counter.v).toLocaleString('en-US');
            },
          });
        });

        // Marquee of real model ids. Scroll speed pushes it, scroll direction flips it.
        const marquee = gsap.to('[data-marquee-track]', { xPercent: -50, ease: 'none', duration: 70, repeat: -1 });
        marquee.totalTime(70 * 50);
        ScrollTrigger.create({
          trigger: '[data-marquee]',
          start: 'top bottom',
          end: 'bottom top',
          onUpdate(self) {
            const velocity = self.getVelocity();
            const direction = velocity < 0 ? -1 : 1;
            gsap.to(marquee, {
              timeScale: direction * (1 + Math.min(Math.abs(velocity) / 250, 7)),
              duration: 0.25,
              overwrite: true,
              onComplete: () => {
                gsap.to(marquee, { timeScale: direction, duration: 1.2 });
              },
            });
          },
        });

        // Tools: horizontal pan on wide screens; the scene steps back so panels read cleanly.
        gsap.fromTo(gate, { intensity: 0.5 }, { intensity: 0.22, ...scrub('[data-tools]', 'top bottom', 'top top') });
        const tools = document.querySelector<HTMLElement>('[data-tools]');
        const track = document.querySelector<HTMLElement>('[data-tools-track]');
        if (desktop && tools && track) {
          tools.classList.add('is-panning');
          const distance = () => Math.max(0, track.scrollWidth - window.innerWidth);
          gsap.to(track, {
            x: () => -distance(),
            ease: 'none',
            scrollTrigger: {
              trigger: tools,
              start: 'top top',
              end: () => `+=${distance()}`,
              pin: true,
              scrub: 1,
              invalidateOnRefresh: true,
            },
          });
        }

        // Security: the ring returns beside the statements; each line lights up as it passes.
        gsap.fromTo(
          gate,
          { morph: 3, offsetX: 0, intensity: 0.22 },
          { morph: 1, offsetX: desktop ? 0.58 : 0, intensity: desktop ? 0.6 : 0.3, ...scrub('#security', 'top bottom', 'top 20%') },
        );
        gsap.utils.toArray<HTMLElement>('[data-line]').forEach((line) => {
          gsap.fromTo(
            line,
            { opacity: 0.22 },
            { opacity: 1, ease: 'none', scrollTrigger: { trigger: line, start: 'top 88%', end: 'top 50%', scrub: true } },
          );
        });

        // Deploy: back to the open cloud, centred under the final call to action.
        gsap.fromTo(
          gate,
          { morph: 1, offsetX: desktop ? 0.58 : 0, offsetY: 0, intensity: desktop ? 0.6 : 0.3 },
          { morph: 0, offsetX: desktop ? 0.3 : 0, offsetY: -0.42, intensity: 0.7, ...scrub('#deploy', 'top bottom', 'top top') },
        );
        gsap.utils.toArray<HTMLElement>('[data-reveal]').forEach((el) => {
          gsap.fromTo(
            el,
            { y: 48, opacity: 0 },
            { y: 0, opacity: 1, duration: 1, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 88%', once: true } },
          );
        });

        // Magnetic primary buttons (mouse only).
        const cleanups: (() => void)[] = [];
        if (window.matchMedia('(pointer: fine)').matches) {
          document.querySelectorAll<HTMLElement>('[data-magnetic]').forEach((el) => {
            const xTo = gsap.quickTo(el, 'x', { duration: 0.6, ease: 'power3.out' });
            const yTo = gsap.quickTo(el, 'y', { duration: 0.6, ease: 'power3.out' });
            const move = (e: PointerEvent) => {
              const r = el.getBoundingClientRect();
              xTo((e.clientX - (r.left + r.width / 2)) * 0.3);
              yTo((e.clientY - (r.top + r.height / 2)) * 0.4);
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
          cleanups.forEach((fn) => fn());
          flow?.classList.remove('is-pinned');
          tools?.classList.remove('is-panning');
        };
      },
    );

    // Web fonts change line heights; re-measure pinned sections once they load.
    document.fonts?.ready.then(() => ScrollTrigger.refresh());

    return () => mm.revert();
  }, []);

  return null;
}
