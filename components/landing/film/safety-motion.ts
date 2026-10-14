import { gsap } from 'gsap';
import { draw, fadeIn, one, trace, undrawn, within, type Tl } from './kit';

/** Safety. The paragraph lights word by word from 0.1 to 1.0. */
export function safetyFilm(tl: Tl) {
  const q = (key: string) => within('keys', `[data-s="${key}"]`);
  const el = (key: string) => one('keys', `[data-s="${key}"]`);

  undrawn([...q('pill'), ...q('shackle'), ...q('body'), ...q('arc'), ...q('face')]);
  gsap.set([...q('link'), ...q('lock'), ...q('dial'), ...q('clock')], { opacity: 0 });

  // The link, its secret turning to dots, and a lock closing over it.
  fadeIn(tl, q('link'), 0.02, 0.05);
  trace(tl, el('pill') as SVGPathElement | null, el('head'), 0.02, 0.2);
  tl.to(el('secret'), { scrambleText: { text: '•••••••••', chars: '•*#%&', speed: 0.6 }, duration: 0.15 }, 0.2);
  fadeIn(tl, q('lock'), 0.25, 0.05);
  draw(tl, q('body'), 0.25, 0.12);
  draw(tl, q('shackle'), 0.3, 0.1);
  tl.fromTo(q('shackle'), { y: -26 }, { y: 0, duration: 0.08, ease: 'back.in(3)', immediateRender: false }, 0.42);
  tl.fromTo(q('lock'), { filter: 'none' }, { filter: 'url(#glow-strong)', duration: 0.04, yoyo: true, repeat: 1, immediateRender: false }, 0.5);

  // A budget: the real limit.
  fadeIn(tl, q('dial'), 0.5, 0.05);
  draw(tl, q('arc'), 0.52, 0.2, 'power2.out');

  // Links that expire: the clock runs, the file fades.
  fadeIn(tl, q('clock'), 0.68, 0.05);
  draw(tl, q('face'), 0.68, 0.12);
  tl.fromTo(q('hand'), { rotation: 0, svgOrigin: '430 470' }, { rotation: 360, svgOrigin: '430 470', duration: 0.35, ease: 'none', immediateRender: false }, 0.8);
  tl.to(q('file'), { opacity: 0, y: -14, duration: 0.3 }, 0.82);
}
