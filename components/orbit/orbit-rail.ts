import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { scrollToY } from '../motion/smooth-scroll';

/**
 * The chapter orbit, which is also the page's scrollbar. The ring follows the
 * scroll position from top to bottom, passing each chapter's star where that
 * chapter starts. Drag the ring to scrub through the story; click
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
  let active = -1;

  /**
   * The rail is a true scrollbar: the ring sits at the page's scroll
   * position, top to bottom, and each star sits where its chapter starts
   * (the first at the very top), so the ring reaches the end only with the page.
   */
  const max = () => Math.max(ScrollTrigger.maxScroll(window), 1);
  const startOf = (index: number) => (index === 0 ? 0 : gsap.utils.clamp(0, max(), chapters[index].st.start));

  /** Places each star where its chapter starts. Run after every refresh. */
  const placeStars = () =>
    chapters.forEach(({ link }, index) => link?.parentElement?.style.setProperty('--at', (startOf(index) / max()).toFixed(4)));

  /** Scroll offset → the chapter being read, and the ring's place on the line (0..1). */
  const toShip = (y: number) => {
    let index = 0;
    while (index < chapters.length - 1 && y >= startOf(index + 1)) index++;
    return { index, ship: gsap.utils.clamp(0, 1, y / max()) };
  };

  /** Place on the line (0..1) → scroll offset; the inverse of toShip. */
  const toScroll = (ship: number) => gsap.utils.clamp(0, 1, ship) * max();

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
    // The tag itself is rotated in CSS, so animate what is inside it.
    if (motion && tag) gsap.fromTo(tag.children, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.6, ease: 'expo.out', stagger: 0.06, overwrite: true });
  };

  ScrollTrigger.create({
    start: 0,
    end: 'max',
    onUpdate: (self) => update(self.scroll()),
    onRefresh: (self) => {
      placeStars();
      update(self.scroll());
    },
  });
  placeStars();
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
