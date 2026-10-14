import { Shards, Spark } from './star-defs';

// Price: a receipt draws itself. The model's price is one solid bar; the app's
// markup and monthly plan are bars of loose star dust stacked on top. Then a
// slash of light cuts through and the extras shatter, leaving the model's price.
// The resting state (no motion) shows the extras crossed out.

const L = 176; // left edge of the receipt's content
const zigzag = Array.from({ length: 12 }, (_, i) => `L${450 - (i + 1) * 25},${i % 2 ? 500 : 516}`).join(' ');

export function PriceArt() {
  return (
    <svg className="film" viewBox="0 0 600 600" aria-hidden="true">
      <path className="ln" data-p="paper" d={`M150,60 H450 V500 ${zigzag} Z`} />
      <text className="mono label" x={L} y={100} data-p="title">
        YOUR BILL
      </text>
      <line className="ln dots" x1={L} y1={118} x2={424} y2={118} data-p="rule" />

      <g data-p="row-model">
        <text className="mono small" x={L} y={160}>
          Model price
        </text>
        <rect className="bar" x={L} y={172} width={80} height={12} rx={2} data-p="bar" />
      </g>
      <g data-p="row-extra" className="extra">
        <text className="mono small" x={L} y={220}>
          + App markup
        </text>
        <rect className="bar dust" x={L} y={232} width={56} height={12} rx={2} data-p="bar" />
      </g>
      <g data-p="row-extra" className="extra">
        <text className="mono small" x={L} y={280}>
          + Monthly plan
        </text>
        <rect className="bar dust" x={L} y={292} width={96} height={12} rx={2} data-p="bar" />
      </g>
      <line className="ln strike" x1={168} y1={225} x2={300} y2={225} data-p="strike" />
      <line className="ln strike" x1={168} y1={285} x2={340} y2={285} data-p="strike" />

      <line className="ln dots" x1={L} y1={334} x2={424} y2={334} data-p="rule" />
      <text className="mono label" x={L} y={370} data-p="total-label">
        YOU PAY
      </text>
      <rect className="bar" x={L} y={384} width={80} height={16} rx={2} data-p="total-model" />
      <g className="extra">
        <rect className="bar dust" x={L + 80} y={384} width={56} height={16} rx={2} data-p="total-extra" />
        <rect className="bar dust" x={L + 136} y={384} width={96} height={16} rx={2} data-p="total-extra" />
      </g>
      <text className="mono small bright" x={L} y={438} data-p="verdict">
        = the provider&apos;s list price
      </text>

      <Shards x={L} y={232} w={56} h={12} count={26} seed={11} data-p="dust" />
      <Shards x={L} y={292} w={96} h={12} count={40} seed={23} data-p="dust" />
      <Shards x={L + 80} y={384} w={152} h={16} count={70} seed={37} data-p="dust" />

      <line className="ln slash" x1={110} y1={540} x2={500} y2={40} data-p="slash" />
      <Spark data-p="head" className="head" />
    </svg>
  );
}
