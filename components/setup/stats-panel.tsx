'use client';

import { gsap } from 'gsap';
import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin';
import { useEffect, useRef } from 'react';
import type { Stats, Usage } from '@/lib/stats';
import { loadStats, useSetup } from './setup-store';

gsap.registerPlugin(DrawSVGPlugin);

// The owner's usage, unlocked by their secret. Charts are drawn in SVG in the
// page's style: a line that draws itself with stars on the days with spend,
// and bars that grow. Nothing here is guessed: every number comes from AI
// Gateway's own report.

export function usd(value: number): string {
  if (value === 0) return '$0';
  if (value < 0.01) return '<$0.01';
  return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const sum = (rows: Usage[] | null) =>
  (rows ?? []).reduce((total, row) => ({ cost: total.cost + row.cost, requests: total.requests + row.requests }), { cost: 0, requests: 0 });

const CHART = { w: 600, h: 200, pad: 14 };

function DailyChart({ days }: { days: NonNullable<Stats['days']> }) {
  const max = Math.max(...days.map((d) => d.cost), 0);
  const x = (i: number) => CHART.pad + (i / (days.length - 1)) * (CHART.w - CHART.pad * 2);
  const y = (cost: number) => CHART.h - CHART.pad - (max > 0 ? (cost / max) * (CHART.h - CHART.pad * 2 - 10) : 0);
  const line = days.map((d, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(d.cost).toFixed(1)}`).join(' ');
  return (
    <figure className="chart">
      <svg className="film" viewBox={`0 0 ${CHART.w} ${CHART.h}`} role="img" aria-label={`Spend per day for the last ${days.length} days, highest ${usd(max)}.`}>
        <line className="ln dim" x1={CHART.pad} y1={CHART.h - CHART.pad} x2={CHART.w - CHART.pad} y2={CHART.h - CHART.pad} />
        <path className="ln chart-line" d={line} data-chart-line />
        {days.map((d, i) =>
          d.cost > 0 ? <circle key={d.day} className="fill chart-dot" cx={x(i)} cy={y(d.cost)} r={3.2} data-chart-dot /> : null,
        )}
      </svg>
      <figcaption>
        <span>{days[0].day}</span>
        <span>Highest day {usd(max)}</span>
        <span>{days.at(-1)!.day}</span>
      </figcaption>
    </figure>
  );
}

function Bars({ rows }: { rows: { label: string; cost: number; requests: number }[] }) {
  if (rows.length === 0) return <p className="empty-hint">Nothing yet. It fills in as your chat app makes calls.</p>;
  const max = Math.max(...rows.map((r) => r.cost), 0.000001);
  return (
    <ul className="bars">
      {rows.map((row) => (
        <li key={row.label}>
          <span className="bar-label">{row.label}</span>
          <span className="bar-track">
            <span className="bar-fill" style={{ width: `${Math.max(2, (row.cost / max) * 100)}%` }} data-bar />
          </span>
          <span className="bar-value">
            {usd(row.cost)} <small>{row.requests.toLocaleString('en-US')} calls</small>
          </span>
        </li>
      ))}
    </ul>
  );
}

function Ready({ stats }: { stats: Stats }) {
  const ref = useRef<HTMLDivElement>(null);
  const total = sum(stats.days);

  useEffect(() => {
    if (!ref.current || !document.documentElement.classList.contains('motion-ok')) return;
    const ctx = gsap.context(() => {
      gsap.fromTo('[data-chart-line]', { drawSVG: '0%' }, { drawSVG: '100%', duration: 1.6, ease: 'power2.inOut' });
      gsap.fromTo('[data-chart-dot]', { scale: 0, transformOrigin: '50% 50%' }, { scale: 1, duration: 0.5, ease: 'back.out(3)', stagger: 0.04, delay: 0.6 });
      gsap.fromTo('[data-bar]', { scaleX: 0, transformOrigin: '0% 50%' }, { scaleX: 1, duration: 1, ease: 'expo.out', stagger: 0.06 });
      gsap.fromTo('[data-stat]', { y: 16, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8, ease: 'expo.out', stagger: 0.08 });
    }, ref);
    return () => ctx.revert();
  }, [stats]);

  return (
    <div ref={ref} className="stats">
      <div className="stat-cards">
        <div className="stat" data-stat>
          <span className="stat-label">Credits left</span>
          <strong>{stats.credits ? usd(stats.credits.balance) : '–'}</strong>
          <span className="stat-note">Whole Vercel team</span>
        </div>
        <div className="stat" data-stat>
          <span className="stat-label">Used in total</span>
          <strong>{stats.credits ? usd(stats.credits.totalUsed) : '–'}</strong>
          <span className="stat-note">Whole Vercel team</span>
        </div>
        <div className="stat" data-stat>
          <span className="stat-label">This connector</span>
          <strong>{stats.days ? usd(total.cost) : '–'}</strong>
          <span className="stat-note">Last 30 days</span>
        </div>
        <div className="stat" data-stat>
          <span className="stat-label">Calls</span>
          <strong>{stats.days ? total.requests.toLocaleString('en-US') : '–'}</strong>
          <span className="stat-note">Last 30 days</span>
        </div>
      </div>

      {stats.days && (
        <section className="stat-block">
          <h3>Spend per day</h3>
          <DailyChart days={stats.days} />
        </section>
      )}
      <div className="stat-pair">
        {stats.models && (
          <section className="stat-block">
            <h3>By model</h3>
            <Bars rows={stats.models.slice(0, 8).map((m) => ({ label: m.model, cost: m.cost, requests: m.requests }))} />
          </section>
        )}
        {stats.apps && (
          <section className="stat-block">
            <h3>By chat app</h3>
            <Bars rows={stats.apps.map((a) => ({ label: a.app, cost: a.cost, requests: a.requests }))} />
          </section>
        )}
      </div>

      {stats.problems.map((problem) => (
        <p key={problem} className="stat-problem">
          {problem}
        </p>
      ))}
      <p className="stat-footnote">
        Credits belong to your whole Vercel team. Everything else counts only calls made through this connector. Updated{' '}
        {new Date(stats.generatedAt).toLocaleTimeString()}.{' '}
        <button type="button" className="link-button" onClick={() => void loadStats()}>
          Refresh
        </button>
      </p>
    </div>
  );
}

export function StatsPanel() {
  const { stats } = useSetup();
  if (stats.state === 'ready') return <Ready stats={stats.stats} />;
  if (stats.state === 'loading') {
    return (
      <div className="stats is-loading" role="status">
        <span className="skeleton" aria-label="Loading your usage" />
      </div>
    );
  }
  return (
    <div className="stats-locked">
      <p>
        {stats.state === 'fail' ? stats.message : 'Your usage appears here once you paste your secret in “Get your link and test it”.'}
      </p>
      <a className="btn btn-ghost btn-small" href="#connect">
        Go to that step
      </a>
    </div>
  );
}
