import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { scrollToY } from '../motion/smooth-scroll';

/**
 * The chapter orbit, which is also the landing page's scrollbar. The ring
 * sits on a chapter's star when that chapter starts and drifts toward the
 * next one as you read. Drag the ring to scrub through the story; click
 * anywhere on the line to fly there. Create it after the pins so positions
 * include pin spacing. Returns a cleanup.
 */
export function setupOrbitRail(motion: boolean): () => void {
  const sections = gsap.utils.toArray<HTMLElement>('[data-chapter]');
  const chapters = sections.map((section) => {
    const trigger = section.parentElement?.classList.contains('pin-spacer') ? section.parentElement : section;
    return {
      link: document.querySelector<HTMLElement>(`[data-rail="${section.dataset.chapter}"]`),
      st: ScrollTrigger.create({ trigger, start: 'top center', end: 'bottom center' }),
    };
  });
  const orbits = gsap.utils.toArray<HTMLElement>('[data-orbit]');
  const nav = document.querySelector<HTMLElement>('nav.orbit');
  const rail = nav?.querySelector<HTMLElement>('.orbit-rail');
  const ring = nav?.querySelector<HTMLElement>('.orbit-ring');
  const tag = document.querySelector<HTMLElement>('[data-orbit-tag]');
  const num = document.querySelector<HTMLElement>('[data-orbit-num]');
  const label = document.querySelector<HTMLElement>('[data-orbit-label]');
  const count = document.querySelector<HTMLElement>('[data-orbit-count]');
  const percent = document.querySelector<HTMLElement>('[data-orbit-pct]');
  const last = Math.max(chapters.length - 1, 1);
  let active = -1;

  /** Scroll offset → position on the line (0..1). */
  const toShip = (y: number) => {
    let index = 0;
    while (index < chapters.length - 1 && y >= chapters[index + 1].st.start) index++;
    const { start, end } = chapters[index].st;
    const within = gsap.utils.clamp(0, 1, (y - start) / Math.max(end - start, 1));
    return { index, ship: gsap.utils.clamp(0, 1, (index + within) / last) };
  };

  /** Position on the line (0..1) → scroll offset; the inverse of toShip. */
  const toScroll = (ship: number) => {
    const at = gsap.utils.clamp(0, 1, ship) * last;
    const index = Math.min(Math.floor(at), last);
    const { start, end } = chapters[index].st;
    const y = index === last && at >= last ? end : start + (at - index) * (end - start);
    return gsap.utils.clamp(0, ScrollTrigger.maxScroll(window), y);
  };

  const update = (y: number) => {
    const { index, ship } = toShip(y);
    orbits.forEach((orbit) => orbit.style.setProperty('--ship', ship.toFixed(4)));
    if (percent) percent.textContent = `${Math.round((y / Math.max(ScrollTrigger.maxScroll(window), 1)) * 100)}%`;
    if (index === active) return;
    active = index;
    chapters.forEach(({ link }, i) => {
      link?.classList.toggle('is-active', i === index);
      link?.classList.toggle('is-past', i < index);
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

  if (!rail || !ring || !nav) return () => {};

  const shipAt = (clientY: number) => {
    const box = rail.getBoundingClientRect();
    return (clientY - box.top) / box.height;
  };

  // Drag the ring: the page follows the pointer exactly.
  let dragging = false;
  const onRingDown = (event: PointerEvent) => {
    event.preventDefault();
    event.stopPropagation();
    dragging = true;
    ring.setPointerCapture(event.pointerId);
    nav.classList.add('is-dragging');
  };
  const onRingMove = (event: PointerEvent) => {
    if (dragging) scrollToY(toScroll(shipAt(event.clientY)), true);
  };
  const onRingUp = (event: PointerEvent) => {
    if (!dragging) return;
    dragging = false;
    ring.releasePointerCapture(event.pointerId);
    nav.classList.remove('is-dragging');
  };
  // Click the line anywhere (stars keep their own links): fly there.
  const onRailDown = (event: PointerEvent) => {
    // On touch screens only the ring responds; a thumb near the edge keeps scrolling the page.
    if (event.pointerType === 'touch' || (event.target as Element).closest('a, .orbit-ring')) return;
    scrollToY(toScroll(shipAt(event.clientY)));
  };

  ring.addEventListener('pointerdown', onRingDown);
  ring.addEventListener('pointermove', onRingMove);
  ring.addEventListener('pointerup', onRingUp);
  ring.addEventListener('pointercancel', onRingUp);
  rail.addEventListener('pointerdown', onRailDown);
  return () => {
    ring.removeEventListener('pointerdown', onRingDown);
    ring.removeEventListener('pointermove', onRingMove);
    ring.removeEventListener('pointerup', onRingUp);
    ring.removeEventListener('pointercancel', onRingUp);
    rail.removeEventListener('pointerdown', onRailDown);
    nav.classList.remove('is-dragging');
  };
}
