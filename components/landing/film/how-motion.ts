import { gsap } from 'gsap';
import { draw, fadeIn, one, pop, trace, travel, type, undrawn, within, type Tl } from './kit';

/**
 * How it works. Beats show at 0.5, 1.55, 2.6 and 3.65; the journey is timed
 * to them: connector, prompt, private link, gateway and back.
 */
export function howFilm(tl: Tl) {
  const q = (key: string) => within('how', `[data-h="${key}"]`);
  const el = (key: string) => one('how', `[data-h="${key}"]`);
  const path = (key: string) => el(key) as SVGPathElement | null;
  const head = el('head');
  const comet = el('comet');

  undrawn([el('chat'), ...q('chat-bar'), ...q('input'), ...q('send'), ...q('link-pill'), ...q('ring'), ...q('spoke'), ...q('frame'), ...q('mountains')]);
  gsap.set([...q('chat-dots'), ...q('chat-title'), ...q('connector'), ...q('bubble'), ...q('link'), ...q('ring-label')], { opacity: 0 });
  gsap.set([...q('node'), ...q('chosen'), ...q('bill'), ...q('moon')], { opacity: 0 });
  gsap.set(within('how', '[data-h="pixels"] circle'), { opacity: 0 });
  gsap.set([comet, head], { opacity: 0 });

  // 1. A chat window, and a connector clicks into it.
  trace(tl, path('chat'), head, 0.05, 0.4);
  draw(tl, q('chat-bar'), 0.3, 0.15);
  pop(tl, within('how', '[data-h="chat-dots"]'), 0.35, 0.15);
  fadeIn(tl, q('chat-title'), 0.38);
  tl.fromTo(q('connector'), { x: 160, opacity: 0 }, { x: 0, opacity: 1, duration: 0.25, ease: 'power3.out', immediateRender: false }, 0.6);
  tl.fromTo(q('connector'), { scale: 1 }, { scale: 1.08, duration: 0.05, yoyo: true, repeat: 1, transformOrigin: '0% 50%', immediateRender: false }, 0.86);

  // 2. You type, and send.
  draw(tl, q('input'), 1.3, 0.2);
  type(tl, el('typing'), 1.5, 0.45);
  draw(tl, q('send'), 1.9, 0.08);
  tl.to(q('typing'), { opacity: 0, duration: 0.06 }, 2.02);
  tl.fromTo(q('bubble'), { opacity: 0, y: 120 }, { opacity: 1, y: 0, duration: 0.18, ease: 'power3.out', immediateRender: false }, 2.02);

  // 3. It leaves as a comet and passes through your private link.
  const out = path('route-out');
  const into = path('route-in');
  const back = path('route-back');
  if (comet && out && into && back) {
    fadeIn(tl, q('link'), 2.25, 0.1);
    draw(tl, q('link-pill'), 2.25, 0.25);
    undrawn([out, into, back]);
    travel(tl, comet, out, 2.3, 0.32, 'power2.in', { rotate: true, origin: [0.81, 0.5] });
    draw(tl, out, 2.3, 0.32, 'power2.in');
    tl.to(el('secret'), { scrambleText: { text: '•••••••••', chars: '•*#%&', speed: 0.6 }, duration: 0.25 }, 2.62);
    tl.fromTo(q('link-pill'), { filter: 'none' }, { filter: 'url(#glow-strong)', duration: 0.04, yoyo: true, repeat: 1, immediateRender: false }, 2.62);

    // 4. Into AI Gateway, which picks the model, and the picture comes back.
    draw(tl, q('ring'), 2.75, 0.3);
    fadeIn(tl, q('ring-label'), 2.9);
    travel(tl, comet, into, 3.05, 0.28, 'power2.in', { rotate: true, origin: [0.81, 0.5] });
    draw(tl, into, 3.05, 0.28, 'power2.in');
    tl.fromTo(q('pulse'), { opacity: 0.9, scale: 1, transformOrigin: '50% 50%' }, { opacity: 0, scale: 1.7, duration: 0.3, ease: 'power2.out', immediateRender: false }, 3.33);
    draw(tl, q('spoke'), 3.4, 0.2);
    pop(tl, [...q('node'), ...q('chosen')], 3.45, 0.18, 0.03);
    tl.to(q('chosen'), { scale: 1.25, transformOrigin: '50% 50%', filter: 'url(#glow-strong)', duration: 0.12 }, 3.75);
    travel(tl, comet, back, 3.88, 0.38, 'power1.inOut', { rotate: true, origin: [0.81, 0.5] });
    draw(tl, back, 3.88, 0.38, 'power1.inOut');
    trace(tl, path('frame'), head, 4.2, 0.18);
    tl.fromTo(
      within('how', '[data-h="pixels"] circle'),
      { opacity: 0 },
      { opacity: (_: number, target: Element) => Number(target.getAttribute('opacity') ?? 1), duration: 0.05, stagger: { each: 0.004, from: 'random' }, immediateRender: false },
      4.28,
    );
    draw(tl, q('mountains'), 4.45, 0.15);
    pop(tl, q('moon'), 4.55, 0.12);
    pop(tl, q('bill'), 4.62, 0.18);
  }
  tl.to({}, { duration: 0.1 }, 4.9);
}
