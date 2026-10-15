import type { Stats } from '@/lib/stats';

// Development only: made-up usage for previewing the populated dashboard with
// /?sample-stats. StatsPanel loads this only when NODE_ENV is not production,
// so production builds never include it or show these numbers.

export function sampleStats(): Stats {
  const today = new Date();
  // A deterministic month: quiet weekdays, a few busy days with video.
  const days = Array.from({ length: 30 }, (_, i) => {
    const day = new Date(today.getTime() - (29 - i) * 86_400_000).toISOString().slice(0, 10);
    const wave = Math.max(0, Math.sin(i * 0.7) + Math.sin(i * 0.23) * 0.8);
    const busy = [6, 13, 21, 27].includes(i) ? 3.2 : 0;
    const cost = i % 9 === 4 ? 0 : +(wave * 0.9 + busy).toFixed(4);
    return { day, cost, requests: cost === 0 ? 0 : Math.round(cost * 14 + 3) };
  });
  return {
    credits: { balance: 41.37, totalUsed: 58.63 },
    days,
    models: [
      { model: 'google/veo-3.1-fast-generate-001', name: 'Veo 3.1 Fast Generate', cost: 19.2, requests: 24 },
      { model: 'google/gemini-3-pro-image', name: 'Nano Banana Pro (Gemini 3 Pro Image)', cost: 6.85, requests: 51 },
      { model: 'bfl/flux-2-pro', name: 'FLUX.2 [pro]', cost: 2.4, requests: 60 },
      { model: 'klingai/kling-v3.0-motion-control', name: 'Kling 3.0 Motion Control', cost: 1.68, requests: 3 },
      { model: 'openai/tts-1-hd', name: 'TTS-1 HD', cost: 0.42, requests: 18 },
      { model: 'openai/gpt-5-mini', name: 'GPT-5 mini', cost: 0.07, requests: 33 },
    ],
    apps: [
      { app: 'Claude', cost: 22.1, requests: 141 },
      { app: 'ChatGPT', cost: 7.9, requests: 44 },
      { app: 'Other apps', cost: 0.62, requests: 4 },
    ],
    problems: [],
    generatedAt: today.toISOString(),
  };
}
