import { gsap } from 'gsap';
import { decode, draw, fadeOut, one, pop, trace, undrawn, within, type Tl } from './kit';

/** Open source. Headline at 0; beats at 1.05 ($0), 2.05 (your copy), 3.05 (why). */
export function openFilm(tl: Tl) {
  const q = (key: string) => within('open', `[data-o="${key}"]`);
  const el = (key: string) => one('open', `[data-o="${key}"]`);
  const head = el('head');

  gsap.set([...q('code'), ...q('zero')], { opacity: 1 });
  gsap.set([...q('copy'), ...q('mine'), ...q('mine-label'), ...q('stamp')], { opacity: 0 });
  gsap.set(q('zero'), { opacity: 0 });
  undrawn([...q('lt'), ...q('gt'), ...q('fork')]);
  // The main line starts as the slash of </>.
  gsap.set(q('main'), { attr: { x1: 330, y1: 210, x2: 270, y2: 390 }, opacity: 0 });

  // </>
  trace(tl, el('lt') as SVGPathElement | null, head, 0.05, 0.22);
  tl.fromTo(q('main'), { opacity: 0, scale: 0.4, transformOrigin: '50% 50%' }, { opacity: 1, scale: 1, duration: 0.15, ease: 'back.out(2)', immediateRender: false }, 0.25);
  trace(tl, el('gt') as SVGPathElement | null, head, 0.38, 0.22);

  // I charge nothing: $0 decodes under the brackets.
  decode(tl, el('zero'), 1.0, 0.35, '$0123456789');

  // You run your own copy: the brackets open, the slash stands up, copies fork off.
  fadeOut(tl, q('zero'), 1.85, 0.1);
  tl.to(q('lt'), { x: -170, opacity: 0, duration: 0.25, ease: 'power3.in' }, 1.9);
  tl.to(q('gt'), { x: 170, opacity: 0, duration: 0.25, ease: 'power3.in' }, 1.9);
  tl.to(q('main'), { attr: { x1: 300, y1: 70, x2: 300, y2: 530 }, duration: 0.3, ease: 'power3.inOut' }, 1.95);
  q('fork').forEach((fork, i) => draw(tl, fork, 2.15 + i * 0.025, 0.15));
  pop(tl, q('copy'), 2.3, 0.1, 0.02);
  pop(tl, q('mine'), 2.55, 0.15);
  pop(tl, q('mine-label'), 2.6, 0.2);

  // Why I made it: every copy lights up in a wave, then the stamp lands.
  tl.to(q('copy'), { opacity: 1, scale: 1.6, transformOrigin: '50% 50%', duration: 0.08, stagger: 0.02, yoyo: true, repeat: 1 }, 3.0);
  tl.fromTo(
    q('stamp'),
    { opacity: 0, scale: 2.2, rotation: -28, transformOrigin: '50% 50%' },
    { opacity: 1, scale: 1, rotation: -8, duration: 0.2, ease: 'back.out(2.2)', immediateRender: false },
    3.2,
  );
}
