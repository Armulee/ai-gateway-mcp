import { gsap } from 'gsap';
import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin';
import { MotionPathPlugin } from 'gsap/MotionPathPlugin';
import { Physics2DPlugin } from 'gsap/Physics2DPlugin';
import { ScrambleTextPlugin } from 'gsap/ScrambleTextPlugin';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { TextPlugin } from 'gsap/TextPlugin';

gsap.registerPlugin(ScrollTrigger, DrawSVGPlugin, MotionPathPlugin, Physics2DPlugin, ScrambleTextPlugin, TextPlugin);

// Toolkit for the landing's motion graphics. Every scene is a pinned, scrubbed
// timeline: time is scroll. Helpers here are the After Effects basics: trim
// paths with a bright head, a comet along a curve, type that decodes itself,
// and star dust that bursts and falls.

export type Tl = gsap.core.Timeline;

// Later scenes start just after 0: a scrubbed timeline renders anything at
// exactly 0 on every refresh, which would let a scene further down overwrite
// the hero's state at load.
export const START = 0.01;

export const show = { opacity: 1, y: 0, duration: 0.18, ease: 'power2.out' };
export const hide = { opacity: 0, y: -36, duration: 0.18, ease: 'power2.in' };

export const scene = (name: string) => document.querySelector<HTMLElement>(`[data-scene="${name}"]`);
export const within = (name: string, selector: string) => gsap.utils.toArray<Element>(`[data-scene="${name}"] ${selector}`);
export const one = (name: string, selector: string) => document.querySelector<SVGElement>(`[data-scene="${name}"] ${selector}`);

export function pinned(name: string, length: string): Tl {
  return gsap.timeline({
    defaults: { ease: 'none' },
    scrollTrigger: { trigger: scene(name), start: 'top top', end: `+=${length}`, pin: true, scrub: 0.8, invalidateOnRefresh: true },
  });
}

type Targets = gsap.TweenTarget;

/** Hide now; a later `draw` reveals. */
export const undrawn = (targets: Targets) => gsap.set(targets, { drawSVG: '0%' });

/** Trim path: the line draws itself. */
export function draw(tl: Tl, targets: Targets, at: number, duration = 0.3, ease = 'power2.inOut') {
  tl.fromTo(targets, { drawSVG: '0%' }, { drawSVG: '100%', duration, ease, immediateRender: false }, at);
}

/** Trim path with a glowing star riding the tip of the line. */
export function trace(tl: Tl, path: SVGPathElement | null, head: Element | null, at: number, duration = 0.35, ease = 'power2.inOut') {
  if (!path) return;
  draw(tl, path, at, duration, ease);
  if (head) travel(tl, head, path, at, duration, ease);
}

type TravelOptions = { reverse?: boolean; rotate?: boolean; origin?: [number, number] };

/** A star (or comet) flying along a path, fading in and out at the ends. */
export function travel(tl: Tl, head: Element, path: SVGPathElement, at: number, duration: number, ease = 'power1.inOut', options: TravelOptions = {}) {
  const { reverse = false, rotate = false, origin = [0.5, 0.5] } = options;
  const route = { path, align: path, alignOrigin: origin, autoRotate: rotate };
  tl.fromTo(head, { opacity: 0 }, { opacity: 1, duration: 0.03, immediateRender: false }, at)
    .fromTo(
      head,
      { motionPath: { ...route, start: reverse ? 1 : 0, end: reverse ? 1 : 0 } },
      { motionPath: { ...route, start: reverse ? 1 : 0, end: reverse ? 0 : 1 }, duration, ease, immediateRender: false },
      at,
    )
    .to(head, { opacity: 0, duration: 0.05 }, at + duration);
}

/** Hidden now; pops in later with a little overshoot. */
export function pop(tl: Tl, targets: Targets, at: number, duration = 0.2, stagger = 0) {
  tl.fromTo(
    targets,
    { opacity: 0, scale: 0.6, transformOrigin: '50% 50%' },
    { opacity: 1, scale: 1, duration, stagger, ease: 'back.out(2)', immediateRender: false },
    at,
  );
}

export function fadeIn(tl: Tl, targets: Targets, at: number, duration = 0.15) {
  tl.fromTo(targets, { opacity: 0 }, { opacity: 1, duration, immediateRender: false }, at);
}

export function fadeOut(tl: Tl, targets: Targets, at: number, duration = 0.15) {
  tl.to(targets, { opacity: 0, duration }, at);
}

/** Type that decodes from noise into its final text. */
export function decode(tl: Tl, el: Element | null, at: number, duration = 0.3, chars = 'upperAndLowerCase') {
  if (!el) return;
  const text = el.textContent ?? '';
  gsap.set(el, { opacity: 0 });
  tl.fromTo(el, { opacity: 0 }, { opacity: 1, duration: 0.04, immediateRender: false }, at).to(
    el,
    { scrambleText: { text, chars, revealDelay: duration * 0.4, speed: 0.5 }, duration },
    at,
  );
}

/** Typing, one character at a time. */
export function type(tl: Tl, el: Element | null, at: number, duration = 0.4) {
  if (!el) return;
  const text = el.textContent ?? '';
  gsap.set(el, { text: '' });
  tl.to(el, { text: { value: text }, duration, ease: 'none' }, at);
}

/** Bars and meters that grow from one end (SVG transform origin, in user units). */
export function grow(tl: Tl, targets: Targets, at: number, duration = 0.2, axis: 'x' | 'y' = 'x', origin = '0% 50%') {
  const from = axis === 'x' ? { scaleX: 0 } : { scaleY: 0 };
  const to = axis === 'x' ? { scaleX: 1 } : { scaleY: 1 };
  tl.fromTo(targets, { ...from, transformOrigin: origin }, { ...to, duration, ease: 'power3.out', immediateRender: false }, at);
}

/** Star dust bursting out of whatever it replaces, then falling. */
export function shatter(tl: Tl, whole: Targets, dust: Element[], at: number, duration = 0.8) {
  tl.to(whole, { opacity: 0, duration: 0.02 }, at);
  tl.fromTo(dust, { opacity: 0 }, { opacity: 1, duration: 0.02, immediateRender: false }, at);
  tl.to(dust, { physics2D: { velocity: 'random(90, 320)', angle: 'random(-170, -10)', gravity: 520 }, duration, ease: 'none' }, at);
  tl.to(dust, { opacity: 0, duration: duration * 0.4 }, at + duration * 0.6);
}
