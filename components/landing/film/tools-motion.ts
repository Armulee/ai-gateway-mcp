import { gsap } from 'gsap';
import { draw, pop, undrawn, within, type Tl } from './kit';
import { orbitSpot } from './tools-art';

/** What it does. Tool i is on screen from i to i + 1 (the text swaps at i). */
export function toolsFilm(tl: Tl, count: number) {
  const q = (key: string) => within('tools', `[data-t="${key}"]`);
  const films = q('film');
  const planets = q('planet');

  // The orbit: a proxy angle places every planet; the front one is brightest.
  const orbit = { turn: 0 };
  const place = () =>
    planets.forEach((planet, i) => {
      const spot = orbitSpot(i, orbit.turn);
      planet.setAttribute('transform', `translate(${spot.x} ${spot.y}) scale(${0.6 + spot.depth * 0.6})`);
      planet.setAttribute('opacity', String(0.3 + spot.depth ** 2 * 0.7));
    });
  place();

  undrawn([...q('lens'), ...q('orbit'), ...q('beam')]);
  gsap.set(films, { opacity: 0 });
  gsap.set(q('planets'), { opacity: 0 });

  draw(tl, q('lens'), 0.02, 0.3);
  draw(tl, q('orbit'), 0.05, 0.35);
  draw(tl, q('beam'), 0.3, 0.12);
  tl.fromTo(q('planets'), { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.15, immediateRender: false }, 0.2);

  for (let i = 1; i < count; i++) {
    tl.to(orbit, { turn: -72 * i, duration: 0.35, ease: 'power3.inOut', onUpdate: place }, i - 0.3);
    tl.to(films[i - 1], { opacity: 0, scale: 0.85, transformOrigin: '50% 50%', duration: 0.12 }, i - 0.25);
    tl.fromTo(films[i], { opacity: 0, scale: 1.15, transformOrigin: '50% 50%' }, { opacity: 1, scale: 1, duration: 0.15, immediateRender: false }, i - 0.08);
  }
  tl.fromTo(films[0], { opacity: 0 }, { opacity: 1, duration: 0.12, immediateRender: false }, 0.22);

  // 0. Scan the catalog, settle on one.
  gsap.set(q('row'), { opacity: 0 });
  undrawn(q('pick'));
  tl.fromTo(q('row'), { opacity: 0, x: -20 }, { opacity: 1, x: 0, duration: 0.06, stagger: 0.03, immediateRender: false }, 0.28);
  tl.fromTo(q('scan'), { y: 0 }, { y: 220, duration: 0.35, ease: 'power1.inOut', immediateRender: false }, 0.4);
  draw(tl, q('pick'), 0.7, 0.12);

  // 1. Write.
  undrawn(q('line'));
  q('line').forEach((line, k) => draw(tl, line, 1.0 + k * 0.1, 0.1, 'none'));

  // 2. A picture from star pixels.
  undrawn([...q('frame'), ...q('hills')]);
  gsap.set(q('pixel'), { opacity: 0 });
  draw(tl, q('frame'), 2.0, 0.12);
  tl.fromTo(
    q('pixel'),
    { opacity: 0 },
    { opacity: (_: number, el: Element) => Number(el.getAttribute('opacity') ?? 1), duration: 0.04, stagger: { each: 0.003, from: 'random' }, immediateRender: false },
    2.08,
  );
  draw(tl, q('hills'), 2.5, 0.15);
  pop(tl, q('sun'), 2.6, 0.12);

  // 3. Film runs through.
  tl.fromTo(q('strip'), { x: 0 }, { x: -480, duration: 0.85, ease: 'none', immediateRender: false }, 2.95);
  pop(tl, q('play'), 3.15, 0.15);

  // 4. The file drops into the tray.
  undrawn([...q('tray'), ...q('tick')]);
  draw(tl, q('tray'), 3.95, 0.12);
  tl.fromTo(q('drop'), { y: -160, opacity: 0 }, { y: 0, opacity: 1, duration: 0.3, ease: 'bounce.out', immediateRender: false }, 4.05);
  draw(tl, q('tick'), 4.4, 0.12);
}
