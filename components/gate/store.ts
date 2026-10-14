// Live parameters of the WebGL "gate". GSAP tweens these plain values directly
// (scroll scrubbing, setup feedback); the render loop reads them every frame,
// so nothing here goes through React state.

export type Shape = 0 | 1 | 2 | 3; // cloud, gate, sort, grid

export const gate = {
  /** 0 cloud, 1 gate, 2 sort, 3 grid. Fractional values blend neighbours. */
  morph: 0,
  /** Scene centre in clip space (-1..1). */
  offsetX: 0,
  offsetY: 0,
  /** 0..1 brightness of the particles; lowered behind long text. */
  intensity: 1,
  scale: 0.9,
};

let pulseStartedAt = Number.NEGATIVE_INFINITY;

/** Sends a light wave through the particles, e.g. after a successful connection test. */
export function pulse() {
  pulseStartedAt = performance.now();
}

export function pulseAge(): number {
  return (performance.now() - pulseStartedAt) / 1000;
}
