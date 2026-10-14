import { Spark } from './star-defs';

// Paying: a year of monthly plan charges gets struck out and the coins fall
// away; a credit meter is topped up and each request takes a sliver; a budget
// line caps what can ever be spent. Resting state: the meter, the budget line
// and the lock.

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
const METER = { x: 250, y: 110, w: 100, h: 360 };
const BUDGET_Y = 210;

export function PayingArt() {
  return (
    <svg className="film" viewBox="0 0 600 600" aria-hidden="true">
      <g data-pay="calendar">
        <rect className="ln" x={110} y={110} width={380} height={330} rx={16} data-pay="cal-frame" />
        <line className="ln dim" x1={110} y1={156} x2={490} y2={156} data-pay="cal-bar" />
        <line className="ln thick" x1={190} y1={92} x2={190} y2={124} data-pay="cal-ring" />
        <line className="ln thick" x1={410} y1={92} x2={410} y2={124} data-pay="cal-ring" />
        <text className="mono tiny dim" x={300} y={140} textAnchor="middle">
          MONTHLY PLAN
        </text>
        {MONTHS.map((month, i) => {
          const x = 124 + (i % 4) * 90;
          const y = 168 + Math.floor(i / 4) * 88;
          return (
            <g key={month} data-pay="cell">
              <rect className="ln dim" x={x} y={y} width={82} height={78} rx={8} />
              <text className="mono tiny dim" x={x + 8} y={y + 16}>
                {month}
              </text>
              <g data-pay="coin">
                <circle className="ln coin" cx={x + 41} cy={y + 46} r={15} />
                <text className="mono tiny" x={x + 41} y={y + 50} textAnchor="middle">
                  $
                </text>
              </g>
            </g>
          );
        })}
        <line className="ln slash" x1={92} y1={470} x2={508} y2={84} data-pay="cal-slash" />
      </g>

      <g data-pay="meter">
        <rect className="ln" x={METER.x} y={METER.y} width={METER.w} height={METER.h} rx={20} data-pay="meter-frame" />
        <rect className="meter-fill" x={METER.x + 8} y={METER.y + 8} width={METER.w - 16} height={METER.h - 16} rx={14} data-pay="fill" />
        {Array.from({ length: 9 }, (_, i) => (
          <line key={i} className="ln dim" x1={METER.x + METER.w + 6} y1={METER.y + 40 + i * 36} x2={METER.x + METER.w + 16} y2={METER.y + 40 + i * 36} />
        ))}
        <text className="mono tiny" x={METER.x + METER.w / 2} y={METER.y + METER.h + 26} textAnchor="middle">
          YOUR CREDITS
        </text>
        <path className="ln thick" d="M200,330 V250 M182,268 L200,248 L218,268" data-pay="topup" />
        <text className="mono tiny" x={200} y={352} textAnchor="middle" data-pay="topup-label">
          top up
        </text>
        {[0, 1, 2, 3].map((i) => (
          <Spark key={i} data-pay="request" className="head" x={40} y={150 + i * 22} size={14} />
        ))}
        <text className="mono tiny dim" x={60} y={250} data-pay="usage-label">
          each request
        </text>
      </g>

      <g data-pay="limit">
        <rect className="meter-fill dim" x={420} y={BUDGET_Y} width={40} height={METER.y + METER.h - BUDGET_Y} rx={8} data-pay="spent" />
        <text className="mono tiny" x={440} y={METER.y + METER.h + 26} textAnchor="middle">
          SPENT
        </text>
        <line className="ln budget" x1={130} y1={BUDGET_Y} x2={500} y2={BUDGET_Y} data-pay="budget" />
        <text className="mono tiny" x={130} y={BUDGET_Y - 10} data-pay="budget-label">
          your budget
        </text>
        <g data-pay="lock">
          <path className="ln" d="M508,206 V198 A12,12 0 0 1 532,198 V206" />
          <rect className="ln" x={502} y={206} width={36} height={28} rx={5} />
          <circle className="fill" cx={520} cy={219} r={3} />
        </g>
      </g>
    </svg>
  );
}
