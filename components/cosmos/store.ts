// Live parameters of the WebGL cosmos. GSAP tweens these plain values while
// the page scrolls; the render loop reads them every frame. No React state.

export const cosmos = {
  /** Camera distance travelled through the starfield (scroll-driven). */
  travel: 0,
  /** 0..1 star brightness. */
  stars: 1,
  /** Faint grey nebula dust. */
  dust: 1,

  /** Eclipse: a black disk with a white corona. Position in screen-height units from centre. */
  eclipse: 1,
  eclipseScale: 1,
  eclipseY: 0.2,

  /** Planet horizon rising from the bottom. lift: 0 hidden, 1 risen. */
  horizon: 0,
  horizonLift: 0,

  /** White flash when the camera passes through the ring. */
  flash: 0,

  /** Model points: one per model in the AI Gateway catalog. */
  points: 0,
  morph: 0,
  pointsX: 0,
  pointsY: 0,
  pointsScale: 0.8,
};

let pulseStartedAt = Number.NEGATIVE_INFINITY;

/** Makes the stars flare briefly, e.g. after a successful connection test. */
export function pulse() {
  pulseStartedAt = performance.now();
}

export function pulseAge(): number {
  return (performance.now() - pulseStartedAt) / 1000;
}
