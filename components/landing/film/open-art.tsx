import { seeded, Spark } from './star-defs';

// Open source: </> draws itself, the brackets swing open like doors, the slash
// stands up as the main line of the code, and copies fork off it as stars,
// one of them yours. Then the MIT stamp. Resting state: the forked tree and
// the stamp.

const random = seeded(29);
export const MAIN = { x: 300, top: 70, bottom: 530 };
const FORKS = Array.from({ length: 14 }, (_, i) => {
  const side = i % 2 ? 1 : -1;
  const y = 110 + i * 29;
  const reach = 80 + random() * 170;
  const end = { x: MAIN.x + side * reach, y: y - 30 - random() * 50 };
  return { d: `M${MAIN.x},${y} C${MAIN.x},${y - 20} ${end.x},${y - 10} ${end.x},${end.y}`, end, mine: i === 9 };
});

export function OpenArt() {
  const mine = FORKS.find((fork) => fork.mine)!;
  return (
    <svg className="film" viewBox="0 0 600 600" aria-hidden="true">
      <line className="ln thick" x1={MAIN.x} y1={MAIN.top} x2={MAIN.x} y2={MAIN.bottom} data-o="main" />
      {FORKS.map((fork, i) => (
        <g key={i}>
          <path className="ln dim" d={fork.d} data-o="fork" />
          <circle className={`fill${fork.mine ? '' : ' dim'}`} cx={fork.end.x} cy={fork.end.y} r={fork.mine ? 6 : 4} data-o={fork.mine ? 'mine' : 'copy'} />
        </g>
      ))}
      <g data-o="mine-label">
        <Spark x={mine.end.x} y={mine.end.y} size={30} />
        <text className="mono tiny" x={mine.end.x + (mine.end.x > MAIN.x ? 16 : -16)} y={mine.end.y - 12} textAnchor={mine.end.x > MAIN.x ? 'start' : 'end'}>
          your copy
        </text>
      </g>

      <g data-o="code" opacity={0}>
        <path className="ln code" d="M220,220 L160,300 L220,380" data-o="lt" />
        <path className="ln code" d="M380,220 L440,300 L380,380" data-o="gt" />
      </g>
      <text className="display-num" x={300} y={500} textAnchor="middle" data-o="zero" opacity={0}>
        $0
      </text>

      <g data-o="stamp" transform="translate(470 470)">
        <circle className="ln" r={58} />
        <circle className="ln dim" r={50} />
        <text className="stamp-big" y={10} textAnchor="middle">
          MIT
        </text>
        <text className="mono tiny" y={-26} textAnchor="middle">
          OPEN SOURCE
        </text>
        <text className="mono tiny" y={36} textAnchor="middle">
          FREE
        </text>
      </g>
      <Spark data-o="head" className="head" />
    </svg>
  );
}
