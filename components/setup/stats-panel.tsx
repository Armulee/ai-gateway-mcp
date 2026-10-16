'use client';

import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useEffect, useRef, useState } from 'react';
import { GATEWAY_DASHBOARD_URL, PAID_PLAN_NOTE, VERCEL_PRICING_URL } from '@/lib/site';
import type { Stats, Usage } from '@/lib/stats';
import { INTRO_DONE } from './open-intro';
import { loadStats, useSetup } from './setup-store';

gsap.registerPlugin(ScrollTrigger);

// What this connector has cost, told in the page's own sky. One big number
// counts up; the last 30 days are columns of light, each topped with a star,
// readable like any bar chart and day by day by pointer or keyboard; models
// are comets whose trails are their share; chat apps split one beam. Nothing is guessed: every number comes from AI Gateway's report.

export function usd(value: number): string {
  if (value === 0) return '$0';
  if (value < 0.01) return '<$0.01';
  return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const sum = (rows: Usage[] | null) =>
  (rows ?? []).reduce((total, row) => ({ cost: total.cost + row.cost, requests: total.requests + row.requests }), { cost: 0, requests: 0 });

/** A percentage rounded the same way on the server and in the browser, so hydration matches. */
const pct = (fraction: number) => `${(fraction * 100).toFixed(3)}%`;

const shortDay = (day: string) => new Date(`${day}T00:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });

type Day = NonNullable<Stats['days']>[number];

/** A round top for the axis and up to four guide lines under it. */
function axisTicks(max: number): number[] {
  if (max <= 0) return [1];
  for (const step of [0.01, 0.02, 0.05, 0.1, 0.2, 0.25, 0.5, 1, 2, 2.5, 5, 10, 20, 25, 50, 100, 200, 250, 500, 1000]) {
    const count = Math.ceil(max / step);
    if (count <= 4) return Array.from({ length: count }, (_, i) => +(step * (i + 1)).toFixed(2));
  }
  return [Math.ceil(max)];
}

/**
 * Spend per day as columns of light: one per day, as tall as that day's spend
 * against round guide lines, each topped with a star. Readable like any bar
 * chart, by pointer, keyboard or the table under it. Locked or loading, the
 * same 30 columns wait low and unlit (no numbers, nothing invented).
 */
function DailyLight({ days, waiting = false }: { days: Day[] | null; waiting?: boolean }) {
  const [active, setActive] = useState<number | null>(null);
  const count = days?.length ?? 30;
  const ticks = days ? axisTicks(Math.max(...days.map((d) => d.cost), 0)) : [];
  const top = ticks.at(-1) ?? 1;
  const peak = days ? days.reduce((best, d, i) => (d.cost > days[best].cost ? i : best), 0) : -1;
  const shown = days && active !== null ? active : null;
  const height = (i: number) => (days ? days[i].cost / top : 0);
  const pick = (clientX: number, box: DOMRect) => setActive(Math.min(count - 1, Math.max(0, Math.floor(((clientX - box.left) / box.width) * count))));

  return (
    <figure className={`days${waiting ? ' is-waiting' : ''}`}>
      <div className="days-frame">
        {days && (
          <div className="days-axis" aria-hidden="true">
            {ticks.map((tick) => (
              <span key={tick} style={{ bottom: pct(tick / top) }}>
                {usd(tick)}
              </span>
            ))}
          </div>
        )}
        <div
          className={`days-plot${shown !== null ? ' is-reading' : ''}`}
          role="img"
          tabIndex={days ? 0 : -1}
          aria-label={
            days
              ? `Spend per day for the last ${count} days. Busiest: ${usd(days[peak].cost)} on ${shortDay(days[peak].day)}. Use the arrow keys to read each day.`
              : 'Your last 30 days, waiting to be unlocked.'
          }
          onPointerMove={days ? (e) => pick(e.clientX, e.currentTarget.getBoundingClientRect()) : undefined}
          onPointerLeave={() => setActive(null)}
          onBlur={() => setActive(null)}
          onKeyDown={(e) => {
            if (!days || (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight')) return;
            e.preventDefault();
            const from = active ?? count - 1;
            setActive(Math.min(count - 1, Math.max(0, from + (e.key === 'ArrowRight' ? 1 : -1))));
          }}
        >
          {ticks.map((tick) => (
            <span key={tick} className="days-guide" style={{ bottom: pct(tick / top) }} />
          ))}
          {Array.from({ length: count }, (_, i) => (
            <span
              key={i}
              className={`day${days && days[i].cost > 0 ? ' is-lit' : ''}${i === peak ? ' is-peak' : ''}${i === shown ? ' is-active' : ''}`}
              style={{ left: pct(i / count), width: pct(1 / count), '--h': pct(height(i)), '--i': String(i) } as React.CSSProperties}
            >
              <i data-day-bar />
            </span>
          ))}
          {days && days[peak].cost > 0 && shown === null && (
            <span className="days-peak" style={{ left: pct((peak + 0.5) / count), bottom: pct(height(peak)) }} data-day-peak>
              {usd(days[peak].cost)}
            </span>
          )}
          {days && shown !== null && (
            <span className={`days-tip${(shown + 0.5) / count > 0.7 ? ' is-left' : ''}`} style={{ left: pct((shown + 0.5) / count) }} role="status">
              <small>{shortDay(days[shown].day)}</small>
              <b>{usd(days[shown].cost)}</b>
              <small>{days[shown].requests.toLocaleString('en-US')} calls</small>
            </span>
          )}
        </div>
      </div>
      {days && (
        <figcaption className="days-dates">
          <span>{shortDay(days[0].day)}</span>
          <span>{shortDay(days.at(-1)!.day)}</span>
        </figcaption>
      )}
      {days && (
        <details className="days-table">
          <summary>Show as a table</summary>
          <table>
            <thead>
              <tr>
                <th>Day</th>
                <th>Spend</th>
                <th>Calls</th>
              </tr>
            </thead>
            <tbody>
              {days.map((d) => (
                <tr key={d.day}>
                  <td>{shortDay(d.day)}</td>
                  <td>{usd(d.cost)}</td>
                  <td>{d.requests.toLocaleString('en-US')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      )}
    </figure>
  );
}

type Row = { label: string; detail?: string; cost: number; requests: number };

/** Where the money went: one comet per model, its trail as long as its share. */
function Comets({ rows }: { rows: Row[] }) {
  if (rows.length === 0) return <p className="empty-hint">Nothing yet. It fills in as your chat app makes calls.</p>;
  const max = Math.max(...rows.map((r) => r.cost), 0.000001);
  return (
    <ul className="comets">
      {rows.map((row) => (
        <li key={row.detail ?? row.label}>
          <span className="comet-name">
            {row.label}
            {row.detail && <small>{row.detail}</small>}
          </span>
          <span className="comet-value">
            {usd(row.cost)}
            <small>{row.requests.toLocaleString('en-US')} calls</small>
          </span>
          {/* Tiny shares still read as a short trail with a head, never a lone dot. */}
          <span className="comet" style={{ '--share': `max(18px, ${pct(row.cost / max)})` } as React.CSSProperties} data-comet>
            <i />
          </span>
        </li>
      ))}
    </ul>
  );
}

/** Which chat app spent it: one beam split by share, each part named under it. */
function AppSplit({ apps }: { apps: Row[] }) {
  const total = apps.reduce((t, a) => t + a.cost, 0);
  if (apps.length === 0 || total === 0) return <p className="empty-hint">Nothing yet. It fills in as your chat app makes calls.</p>;
  return (
    <div className="split">
      <div className="split-beam" aria-hidden="true">
        {apps.map((app, i) => (
          <span key={app.label} style={{ flexGrow: app.cost, '--tone': 1 - i * 0.3 } as React.CSSProperties} data-split />
        ))}
      </div>
      <ul className="split-legend">
        {apps.map((app, i) => (
          <li key={app.label} style={{ '--tone': 1 - i * 0.3 } as React.CSSProperties}>
            <span className="split-swatch" aria-hidden="true" />
            <span className="split-name">{app.label}</span>
            <b>{Math.round((app.cost / total) * 100)}%</b>
            <small>
              {usd(app.cost)}, {app.requests.toLocaleString('en-US')} calls
            </small>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Ready({ stats }: { stats: Stats }) {
  const ref = useRef<HTMLDivElement>(null);
  const total = sum(stats.days);

  useEffect(() => {
    const root = ref.current;
    if (!root || !document.documentElement.classList.contains('motion-ok')) return;
    const number = root.querySelector<HTMLElement>('[data-total]');
    const final = number?.textContent ?? '';
    // While the open intro plays, usage waits for it, so the count is seen.
    const intro = document.querySelector('.open-intro:not(.is-done)');
    let ctx: gsap.Context | undefined;
    const play = () => {
      ctx = gsap.context(() => {
        const tally = { v: 0 };
        const tl = gsap.timeline({ defaults: { ease: 'expo.out' }, scrollTrigger: { trigger: root, start: 'top 75%', once: true } });
        tl.fromTo('[data-usage-rise]', { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 1, stagger: 0.08 }, 0);
        if (number && total.cost > 0) {
          tl.to(
            tally,
            { v: total.cost, duration: 1.8, ease: 'power3.out', onUpdate: () => void (number.textContent = usd(tally.v)), onComplete: () => void (number.textContent = final) },
            0.1,
          );
        }
        // The columns of light rise from the ground, left to right; the busiest day says its amount.
        tl.fromTo('[data-day-bar]', { scaleY: 0, transformOrigin: '50% 100%' }, { scaleY: 1, duration: 1, ease: 'expo.out', stagger: 0.03 }, 0.3);
        tl.fromTo('[data-day-peak]', { opacity: 0 }, { opacity: 1, duration: 0.5 }, 1.3);
        // Wider than the trail top, bottom and right, so the glowing head is never clipped.
        tl.fromTo('[data-comet]', { clipPath: 'inset(-12px 100% -12px 0)' }, { clipPath: 'inset(-12px -16px -12px 0)', duration: 1.3, ease: 'power3.out', stagger: 0.08 }, 0.9);
        tl.fromTo('[data-split]', { scaleX: 0, transformOrigin: '0% 50%' }, { scaleX: 1, duration: 1, stagger: 0.1 }, 1.1);
      }, root);
    };
    if (intro) window.addEventListener(INTRO_DONE, play, { once: true });
    else play();
    return () => {
      window.removeEventListener(INTRO_DONE, play);
      ctx?.revert();
      if (number) number.textContent = final;
    };
  }, [stats, total.cost]);

  return (
    <div ref={ref} className="usage">
      <div className="usage-hero">
        {stats.paidPlanOnly ? (
          <p className="usage-sub" data-usage-rise>
            {PAID_PLAN_NOTE} Each reply in chat shows what that call cost. See the team&apos;s totals in{' '}
            <a href={GATEWAY_DASHBOARD_URL} target="_blank" rel="noopener noreferrer">
              AI Gateway
            </a>
            , or{' '}
            <a href={VERCEL_PRICING_URL} target="_blank" rel="noopener noreferrer">
              compare Vercel plans
            </a>
            .
          </p>
        ) : (
          <>
            <p className="usage-total" data-usage-rise>
              <span data-total>{stats.days ? usd(total.cost) : '–'}</span>
            </p>
            <p className="usage-sub" data-usage-rise>
              spent through this connector in the last 30 days{stats.days ? `, over ${total.requests.toLocaleString('en-US')} calls` : ''}.
            </p>
          </>
        )}
        {stats.credits && (
          <p className="usage-credits" data-usage-rise>
            Your Vercel team has <b>{usd(stats.credits.balance)}</b> of AI Gateway credits left.
          </p>
        )}
      </div>

      {stats.days && (
        <section className="usage-part usage-days">
          <h3>Spend per day</h3>
          <DailyLight days={stats.days} />
        </section>
      )}

      <div className="usage-split">
        {stats.models && (
          <section className="usage-part">
            <h3>Where it went</h3>
            <Comets rows={stats.models.slice(0, 6).map((m) => ({ label: m.name ?? m.model, detail: m.name ? m.model : undefined, cost: m.cost, requests: m.requests }))} />
          </section>
        )}
        {stats.apps && (
          <section className="usage-part">
            <h3>Which chat app</h3>
            <AppSplit apps={stats.apps.map((a) => ({ label: a.app, cost: a.cost, requests: a.requests }))} />
          </section>
        )}
      </div>

      {stats.problems.map((problem) => (
        <p key={problem} className="stat-problem">
          {problem}
        </p>
      ))}
      <p className="stat-footnote">
        {stats.paidPlanOnly ? '' : 'Only calls made through this connector are counted. '}Updated {new Date(stats.generatedAt).toLocaleTimeString()}.{' '}
        <button type="button" className="link-button" onClick={() => void loadStats()}>
          Refresh
        </button>
      </p>
    </div>
  );
}

/** Development only: /?sample-stats previews the unlocked dashboard with made-up numbers. */
function useSampleStats(): Stats | null {
  const [sample, setSample] = useState<Stats | null>(null);
  useEffect(() => {
    if (process.env.NODE_ENV === 'production') return;
    if (!new URLSearchParams(window.location.search).has('sample-stats')) return;
    void import('./sample-stats').then(({ sampleStats }) => setSample(sampleStats()));
  }, []);
  return sample;
}

/** `connectHref` points at the step where the secret is pasted: on the page, or behind ?steps when the guide is hidden. */
export function StatsPanel({ connectHref = '#connect' }: { connectHref?: string }) {
  const { stats } = useSetup();
  const sample = useSampleStats();
  if (sample) return <Ready stats={sample} />;
  if (stats.state === 'ready') return <Ready stats={stats.stats} />;

  // Locked, loading or failed: the same 30 days, unlit, waiting for the secret.
  const loading = stats.state === 'loading';
  return (
    <div className={`usage usage-locked${loading ? ' is-loading' : ''}`} role={loading ? 'status' : undefined}>
      <div className="usage-lock">
        <p className="usage-lock-title">{loading ? 'Reading your usage…' : 'Thirty days, waiting to light up.'}</p>
        <p className="usage-lock-text">
          {stats.state === 'fail' ? stats.message : 'Paste your secret in “Get your link and test it” and every day of spend through this connector appears here.'}
        </p>
        {!loading && (
          <a className="btn btn-ghost btn-small" href={connectHref}>
            Paste your secret
          </a>
        )}
      </div>
      <DailyLight days={null} waiting />
    </div>
  );
}
