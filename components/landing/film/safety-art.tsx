import { Spark } from './star-defs';

// Safety: your link comes back, its secret turns to dots and a lock closes
// over it; a budget dial and a clock that runs the file links down to expiry.

const DIAL = { x: 170, y: 470, r: 78 };
const CLOCK = { x: 430, y: 470, r: 78 };

export function SafetyArt({ hours }: { hours: number }) {
  return (
    <svg className="film" viewBox="0 0 600 600" aria-hidden="true">
      <g data-s="link">
        <path className="ln" d="M82,80 H518 A22,22 0 0 1 518,124 H82 A22,22 0 0 1 82,80 Z" data-s="pill" />
        <text className="mono small" x={300} y={108} textAnchor="middle">
          <tspan className="dim">https://you.vercel.app/mcp/</tspan>
          <tspan data-s="secret">k9X2pQ7mZ</tspan>
        </text>
      </g>

      <g data-s="lock">
        <path className="ln thick" d="M266,232 V204 A34,34 0 0 1 334,204 V232" data-s="shackle" />
        <rect className="ln thick" x={246} y={232} width={108} height={86} rx={14} data-s="body" />
        <circle className="fill" cx={300} cy={268} r={8} />
        <rect className="fill" x={296} y={270} width={8} height={24} rx={3} />
      </g>

      <g data-s="dial">
        <circle className="ln dim" cx={DIAL.x} cy={DIAL.y} r={DIAL.r} />
        <path className="ln thick" d={`M${DIAL.x - DIAL.r},${DIAL.y} A${DIAL.r},${DIAL.r} 0 1 1 ${DIAL.x},${DIAL.y + DIAL.r}`} data-s="arc" />
        <text className="mono tiny" x={DIAL.x} y={DIAL.y + 4} textAnchor="middle">
          BUDGET
        </text>
      </g>

      <g data-s="clock">
        <circle className="ln" cx={CLOCK.x} cy={CLOCK.y} r={CLOCK.r} data-s="face" />
        {Array.from({ length: 12 }, (_, i) => {
          const a = (i / 12) * Math.PI * 2;
          return <line key={i} className="ln dim" x1={CLOCK.x + Math.sin(a) * (CLOCK.r - 10)} y1={CLOCK.y - Math.cos(a) * (CLOCK.r - 10)} x2={CLOCK.x + Math.sin(a) * (CLOCK.r - 4)} y2={CLOCK.y - Math.cos(a) * (CLOCK.r - 4)} />;
        })}
        <line className="ln thick" x1={CLOCK.x} y1={CLOCK.y} x2={CLOCK.x} y2={CLOCK.y - CLOCK.r + 18} data-s="hand" />
        <circle className="fill" cx={CLOCK.x} cy={CLOCK.y} r={4} />
        <text className="mono tiny" x={CLOCK.x} y={CLOCK.y + 34} textAnchor="middle">
          {hours}H LINKS
        </text>
        <g data-s="file">
          <path className="ln" d={`M${CLOCK.x - 12},${CLOCK.y - 44} h16 l8,8 v24 h-24 Z`} />
        </g>
      </g>
      <Spark data-s="head" className="head" />
    </svg>
  );
}
