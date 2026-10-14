import { gsap } from 'gsap';
import { decode, draw, fadeIn, fadeOut, one, pop, undrawn, within, type Tl } from './kit';

/** Paying. Beats show at 0.45 (no plan), 1.45 (credits) and 2.45 (limit). */
export function payingFilm(tl: Tl) {
  const q = (key: string) => within('paying', `[data-pay="${key}"]`);
  const fill = one('paying', '[data-pay="fill"]');

  gsap.set(q('calendar'), { opacity: 1 });
  undrawn([...q('cal-frame'), ...q('cal-bar'), ...q('cal-ring'), ...q('cal-slash'), ...q('meter-frame'), ...q('topup'), ...q('budget')]);
  gsap.set([...q('cell'), ...q('coin'), ...q('topup-label'), ...q('usage-label'), ...q('budget-label'), ...q('lock'), ...q('request')], { opacity: 0 });
  gsap.set([...q('meter'), ...q('limit')], { opacity: 1 });
  gsap.set([fill, ...q('spent')], { scaleY: 0, transformOrigin: '50% 100%' });

  // No plan: twelve monthly charges, struck out; the coins fall away.
  draw(tl, q('cal-frame'), 0.02, 0.3);
  draw(tl, [...q('cal-bar'), ...q('cal-ring')], 0.2, 0.15);
  tl.fromTo(q('cell'), { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.08, stagger: 0.015, immediateRender: false }, 0.25);
  pop(tl, q('coin'), 0.42, 0.12, 0.02);
  draw(tl, q('cal-slash'), 0.75, 0.1, 'power4.in');
  tl.to(q('coin'), { y: 'random(380, 520)', rotation: 'random(-160, 160)', transformOrigin: '50% 50%', opacity: 0, duration: 0.4, ease: 'power2.in', stagger: { each: 0.012, from: 'random' } }, 0.85);
  tl.to(q('calendar'), { opacity: 0, scale: 0.9, transformOrigin: '50% 50%', duration: 0.15 }, 1.25);

  // Your own credits: top up, then every request takes a sliver.
  draw(tl, q('meter-frame'), 1.3, 0.25);
  draw(tl, q('topup'), 1.4, 0.15);
  fadeIn(tl, q('topup-label'), 1.45);
  tl.fromTo(fill, { scaleY: 0 }, { scaleY: 1, duration: 0.25, ease: 'power3.out', immediateRender: false }, 1.45);
  fadeOut(tl, [...q('topup'), ...q('topup-label')], 1.72, 0.1);
  fadeIn(tl, q('usage-label'), 1.75);
  q('request').forEach((spark, i) => {
    const at = 1.8 + i * 0.12;
    tl.fromTo(spark, { opacity: 0, x: 0, y: 0 }, { opacity: 1, duration: 0.02, immediateRender: false }, at)
      .to(spark, { x: 250, y: 10 - i * 22, duration: 0.1, ease: 'power2.in' }, at)
      .to(spark, { opacity: 0, duration: 0.02 }, at + 0.1)
      .to(fill, { scaleY: 1 - (i + 1) * 0.09, duration: 0.05 }, at + 0.1);
  });

  // Your own limit: spending climbs to the budget and stops there, locked.
  draw(tl, q('budget'), 2.4, 0.2);
  decode(tl, one('paying', '[data-pay="budget-label"]'), 2.45, 0.2);
  tl.fromTo(q('spent'), { scaleY: 0 }, { scaleY: 1, duration: 0.3, ease: 'power2.out', immediateRender: false }, 2.55);
  tl.fromTo(q('budget'), { filter: 'none' }, { filter: 'url(#glow-strong)', duration: 0.05, yoyo: true, repeat: 1, immediateRender: false }, 2.85);
  pop(tl, q('lock'), 2.88, 0.15);
}
