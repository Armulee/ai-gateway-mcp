// Shared pieces for the landing's motion graphics: a soft glow, a four-point
// star used as the bright head of every line that draws itself, and a field of
// star dots that fills anything that is "extra" (a markup, a plan).

export function StarDefs() {
  return (
    <svg className="star-defs" width="0" height="0" aria-hidden="true" focusable="false">
      <defs>
        <filter id="glow" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="3.2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="glow-strong" x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur stdDeviation="7" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <symbol id="spark" viewBox="-12 -12 24 24" overflow="visible">
          <path d="M0-12 1.5-1.5 12 0 1.5 1.5 0 12-1.5 1.5-12 0-1.5-1.5Z" fill="#fff" />
          <circle r="2.6" fill="#fff" />
        </symbol>
        <pattern id="stardust" width="9" height="9" patternUnits="userSpaceOnUse">
          <circle cx="2" cy="2.5" r="1.3" fill="#fff" />
          <circle cx="6.5" cy="7" r="0.9" fill="#fff" opacity="0.6" />
        </pattern>
        <linearGradient id="tail" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="#fff" stopOpacity="0" />
          <stop offset="1" stopColor="#fff" stopOpacity="0.9" />
        </linearGradient>
      </defs>
    </svg>
  );
}

/** A glowing star, centred on (x, y). Motion paths move its group. */
export function Spark({ x = 0, y = 0, size = 22, ...rest }: { x?: number; y?: number; size?: number } & React.SVGProps<SVGGElement>) {
  return (
    <g {...rest}>
      <use href="#spark" x={x - size / 2} y={y - size / 2} width={size} height={size} filter="url(#glow)" />
    </g>
  );
}

/** Deterministic scatter for star dust, so server and client agree. */
export function seeded(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
}

/** Star specks filling a rectangle; they replace it when it shatters. */
export function Shards({ x, y, w, h, count, seed, ...rest }: { x: number; y: number; w: number; h: number; count: number; seed: number } & React.SVGProps<SVGGElement>) {
  const random = seeded(seed);
  return (
    <g {...rest}>
      {Array.from({ length: count }, (_, i) => (
        <circle key={i} className="shard" cx={x + random() * w} cy={y + random() * h} r={0.8 + random() * 1.6} />
      ))}
    </g>
  );
}
