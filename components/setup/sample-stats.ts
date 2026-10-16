import type { Stats } from '@/lib/stats';

// Made-up usage for the populated dashboard: on the public demo (DEMO_MODE)
// and in development with /?sample-stats. StatsPanel loads it on demand, so a
// normal deployment never shows these numbers.
//
// Every view adds up: the models and the chat apps split the same total as
// the days, in cost and in calls.

type Share = { cost: number; requests: number };

/** Splits a total by weights, in cents and whole calls, with the rounding left on the largest part. */
function split<T>(rows: (T & { weight: number; requestWeight: number })[], total: Share): (T & Share)[] {
  const w = rows.reduce((t, r) => t + r.weight, 0);
  const rw = rows.reduce((t, r) => t + r.requestWeight, 0);
  const parts = rows.map(({ weight, requestWeight, ...row }) => ({
    ...(row as T),
    cost: Math.round((total.cost * weight) / w * 100) / 100,
    requests: Math.max(1, Math.round((total.requests * requestWeight) / rw)),
  }));
  parts[0].cost = Math.round((total.cost - parts.slice(1).reduce((t, p) => t + p.cost, 0)) * 100) / 100;
  parts[0].requests = total.requests - parts.slice(1).reduce((t, p) => t + p.requests, 0);
  return parts;
}

export function sampleStats(): Stats {
  const today = new Date();
  // A deterministic month: quiet weekdays, a few busy days with video.
  const days = Array.from({ length: 30 }, (_, i) => {
    const day = new Date(today.getTime() - (29 - i) * 86_400_000).toISOString().slice(0, 10);
    const wave = Math.max(0, Math.sin(i * 0.7) + Math.sin(i * 0.23) * 0.8);
    const busy = [6, 13, 21, 27].includes(i) ? 3.2 : 0;
    const cost = i % 9 === 4 ? 0 : Math.round((wave * 0.9 + busy) * 100) / 100;
    return { day, cost, requests: cost === 0 ? 0 : Math.round(cost * 14 + 3) };
  });
  const total = {
    cost: Math.round(days.reduce((t, d) => t + d.cost, 0) * 100) / 100,
    requests: days.reduce((t, d) => t + d.requests, 0),
  };
  return {
    credits: { balance: 41.37, totalUsed: 58.63 },
    paidPlanOnly: false,
    days,
    models: split(
      [
        { model: 'google/veo-3.1-fast-generate-001', name: 'Veo 3.1 Fast Generate', weight: 19.2, requestWeight: 24 },
        { model: 'google/gemini-3-pro-image', name: 'Nano Banana Pro (Gemini 3 Pro Image)', weight: 6.85, requestWeight: 51 },
        { model: 'bfl/flux-2-pro', name: 'FLUX.2 [pro]', weight: 2.4, requestWeight: 60 },
        { model: 'klingai/kling-v3.0-motion-control', name: 'Kling 3.0 Motion Control', weight: 1.68, requestWeight: 3 },
        { model: 'openai/tts-1-hd', name: 'TTS-1 HD', weight: 0.42, requestWeight: 18 },
        { model: 'openai/gpt-5-mini', name: 'GPT-5 mini', weight: 0.07, requestWeight: 33 },
      ],
      total,
    ),
    apps: split(
      [
        { app: 'Claude', weight: 22.1, requestWeight: 141 },
        { app: 'ChatGPT', weight: 7.9, requestWeight: 44 },
        { app: 'Other apps', weight: 0.62, requestWeight: 4 },
      ],
      total,
    ),
    problems: [],
    generatedAt: today.toISOString(),
  };
}
