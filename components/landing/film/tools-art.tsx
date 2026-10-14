import { seeded } from './star-defs';

// What it does: five tools orbit below a lens. Scrolling turns the orbit; the
// tool that comes to the front plays its own small film inside the lens: a
// scan through the model list, lines that write themselves, a picture that
// resolves from star pixels, a film strip, a file dropping into its tray.

export const ORBIT = { x: 300, y: 505, rx: 250, ry: 52 };
export const LENS = { x: 300, y: 250, r: 150 };

/** Where tool i sits on the orbit when the orbit is turned by `turn` degrees. */
export function orbitSpot(i: number, turn: number) {
  const a = ((90 + i * 72 + turn) * Math.PI) / 180;
  const depth = (Math.sin(a) + 1) / 2;
  return { x: ORBIT.x + Math.cos(a) * ORBIT.rx, y: ORBIT.y + Math.sin(a) * ORBIT.ry, depth };
}

const random = seeded(17);
const ROWS = Array.from({ length: 6 }, (_, i) => ({ y: 168 + i * 34, w: 110 + random() * 90 }));
const LINES = [200, 180, 210, 150, 190, 120];
const PIXELS = Array.from({ length: 15 * 9 }, (_, i) => ({ x: 196 + (i % 15) * 14.6, y: 182 + Math.floor(i / 15) * 16, o: 0.2 + random() * 0.8 }));

export function ToolsArt() {
  return (
    <svg className="film" viewBox="0 0 600 600" aria-hidden="true">
      <defs>
        <clipPath id="lens-clip">
          <circle cx={LENS.x} cy={LENS.y} r={LENS.r - 3} />
        </clipPath>
      </defs>

      <ellipse className="ln dim orbit-path" cx={ORBIT.x} cy={ORBIT.y} rx={ORBIT.rx} ry={ORBIT.ry} data-t="orbit" />
      <line className="ln dim" x1={LENS.x} y1={LENS.y + LENS.r} x2={ORBIT.x} y2={ORBIT.y + ORBIT.ry - 14} data-t="beam" />
      <circle className="ln" cx={LENS.x} cy={LENS.y} r={LENS.r} data-t="lens" />

      <g clipPath="url(#lens-clip)">
        {/* 0. Find a model: a scan line runs down the catalog and stops on one. */}
        <g data-t="film">
          {ROWS.map((row, i) => (
            <g key={i} data-t="row">
              <circle className="fill" cx={200} cy={row.y} r={4} />
              <rect className="fill dim" x={214} y={row.y - 4} width={row.w} height={8} rx={4} />
              <text className="mono tiny dim" x={400} y={row.y + 4} textAnchor="end">
                $
              </text>
            </g>
          ))}
          <rect className="ln" x={188} y={ROWS[3].y - 15} width={226} height={30} rx={8} data-t="pick" />
          <line className="ln scan" x1={150} y1={150} x2={450} y2={150} data-t="scan" />
        </g>

        {/* 1. Write: lines write themselves, a caret leading. */}
        <g data-t="film">
          {LINES.map((w, i) => (
            <path key={i} className="ln thick" d={`M190,${170 + i * 32} H${190 + w}`} data-t="line" />
          ))}
        </g>

        {/* 2. Make images: a picture resolves out of star pixels. */}
        <g data-t="film">
          <rect className="ln" x={186} y={170} width={228} height={160} rx={10} data-t="frame" />
          {PIXELS.map((p, i) => (
            <circle key={i} className="fill" cx={p.x} cy={p.y} r={1.8} opacity={p.o} data-t="pixel" />
          ))}
          <path className="ln" d="M192,322 L262,236 L300,282 L334,250 L408,322" data-t="hills" />
          <circle className="fill" cx={372} cy={208} r={12} data-t="sun" />
        </g>

        {/* 3. Make videos: a film strip runs through, frames flickering by. */}
        <g data-t="film">
          <g data-t="strip">
            {Array.from({ length: 8 }, (_, i) => (
              <g key={i}>
                <rect className="ln" x={60 + i * 120} y={190} width={108} height={120} rx={6} />
                {Array.from({ length: 5 }, (_, k) => (
                  <rect key={k} className="fill dim" x={66 + i * 120 + k * 21} y={176} width={10} height={8} rx={2} />
                ))}
                {Array.from({ length: 5 }, (_, k) => (
                  <rect key={k} className="fill dim" x={66 + i * 120 + k * 21} y={316} width={10} height={8} rx={2} />
                ))}
              </g>
            ))}
          </g>
          <path className="fill" d="M286,226 L326,250 L286,274 Z" data-t="play" />
        </g>

        {/* 4. Get your video: the file drops into its tray, and a tick. */}
        <g data-t="film">
          <g data-t="drop">
            <path className="ln thick" d="M300,150 V262 M262,226 L300,264 L338,226" />
          </g>
          <path className="ln thick" d="M212,284 V330 H388 V284" data-t="tray" />
          <path className="ln thick" d="M272,356 L292,374 L330,338" data-t="tick" />
        </g>
      </g>

      <g data-t="planets">
      {[0, 1, 2, 3, 4].map((i) => {
        const spot = orbitSpot(i, 0);
        return (
          <g key={i} data-t="planet" transform={`translate(${spot.x} ${spot.y}) scale(${0.6 + spot.depth * 0.6})`} opacity={0.35 + spot.depth * 0.65}>
            <circle className="ln planet" r={16} />
            <text className="mono tiny" y={4} textAnchor="middle">
              {String(i + 1).padStart(2, '0')}
            </text>
          </g>
        );
      })}
      </g>
    </svg>
  );
}
