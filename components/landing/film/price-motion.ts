import { gsap } from 'gsap';
import { decode, draw, fadeIn, grow, shatter, trace, undrawn, within, one, type Tl } from './kit';

/** Price timeline: the receipt draws, extras stack up, then shatter. Length about 2.1. */
export function priceFilm(tl: Tl) {
  const q = (key: string) => within('price', `[data-p="${key}"]`);
  const paper = one('price', '[data-p="paper"]') as SVGPathElement | null;
  const head = one('price', '[data-p="head"]');
  const rows = [...q('row-model'), ...q('row-extra')];
  const dust = within('price', '[data-p="dust"] circle');
  const totals = [...q('total-model'), ...q('total-extra')];

  gsap.set([...within('price', 'g.extra'), ...q('slash')], { opacity: 1 });
  undrawn([paper, ...q('rule'), ...q('strike'), ...q('slash')]);
  gsap.set([...rows, ...q('total-label'), ...q('verdict')], { opacity: 0 });
  gsap.set(q('row-extra'), { opacity: 0 });
  gsap.set(q('bar'), { scaleX: 0, transformOrigin: '0% 50%' });
  gsap.set(totals, { scaleX: 0, transformOrigin: '0% 50%', opacity: 1 });
  gsap.set(dust, { opacity: 0 });

  trace(tl, paper, head, 0.02, 0.4);
  decode(tl, one('price', '[data-p="title"]'), 0.25, 0.25);
  draw(tl, q('rule'), 0.3, 0.2);
  fadeIn(tl, q('total-label'), 0.32);

  // Each line of the bill adds its bar, and the total grows with it.
  rows.forEach((row, i) => {
    const at = 0.38 + i * 0.16;
    fadeIn(tl, row, at, 0.08);
    grow(tl, row.querySelector('[data-p="bar"]'), at + 0.03, 0.14);
    grow(tl, totals[i], at + 0.05, 0.14);
  });

  // "This one does not": a slash of light, and the extras turn to dust.
  draw(tl, q('slash'), 0.95, 0.1, 'power4.in');
  tl.to(q('slash'), { opacity: 0, duration: 0.12 }, 1.08);
  shatter(tl, [...q('row-extra').map((r) => r.querySelector('rect')), ...q('total-extra')], dust, 1.05, 0.7);
  tl.to(q('row-extra'), { opacity: 0.35, duration: 0.1 }, 1.08);
  draw(tl, q('strike'), 1.12, 0.12);
  decode(tl, one('price', '[data-p="verdict"]'), 1.3, 0.3, '$0123456789');

  // The quote's key phrases get underlined in turn.
  tl.fromTo('[data-scene="price"] .hl', { '--hl': 0 }, { '--hl': 1, duration: 0.2, stagger: 0.15, immediateRender: false }, 1.45);
}
