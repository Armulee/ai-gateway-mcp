import type { CallToolResult } from '@modelcontextprotocol/server';
import { textResult } from './gateway';
import type { GatewayModel } from './models';

// Price estimates from AI Gateway's public list prices, for `estimate_only`.
// Nothing is called or charged. Requests leave some choices to the provider
// (resolution, audio defaults), so an estimate is often a range.

type Tier = Record<string, string | boolean | undefined>;

export type Estimate =
  | { low: number; high: number; basis: string; notes: string[] }
  | { unknown: string };

/** Dollars with at least two decimals and at most four: $0.024, $1.20. */
function money(v: number) {
  const [whole, cents = ''] = String(+v.toFixed(4)).split('.');
  return `$${whole}.${cents.padEnd(2, '0')}`;
}
const range = (low: number, high: number) => (low === high ? money(low) : `${money(low)}–${money(high)}`);
const tiersOf = (list: unknown): Tier[] => (Array.isArray(list) ? (list as Tier[]) : []);

/**
 * Narrows price tiers to what the request asked for. A criterion that matches
 * no tier is skipped (e.g. Kling's std/pro modes vs HeyGen's text_to_video
 * modes), so the result is never empty.
 */
function narrow(tiers: Tier[], criteria: Record<string, string | boolean | undefined>) {
  let left = tiers;
  for (const [key, value] of Object.entries(criteria)) {
    if (value === undefined) continue;
    const next = left.filter((t) => t[key] === undefined || t[key] === value);
    if (next.length) left = next;
  }
  return left;
}

export function estimateImage(model: GatewayModel, n: number, size?: string): Estimate {
  const p = model.pricing ?? {};
  // Tiers that depend only on size; quality, style or operation tiers are options this server never sets.
  const sized = tiersOf(p.image_dimension_quality_pricing).filter(
    (t) => t.size && !t.quality && !t.style && !t.operation && Number.isFinite(Number(t.cost)),
  );
  const exact = size ? sized.find((t) => t.size === size) : undefined;
  const costs = exact ? [Number(exact.cost)] : p.image ? [Number(p.image)] : sized.map((t) => Number(t.cost));
  if (costs.length === 0) {
    return p.input || p.output
      ? { unknown: 'This model is priced by tokens, so its cost is only known after the call. The result reports the actual cost.' }
      : { unknown: 'AI Gateway lists no price for this model.' };
  }

  const [low, high] = [Math.min(...costs), Math.max(...costs)];
  const notes: string[] = [];
  if (size && !exact && sized.length) notes.push(`No list price for size "${size}"; listed sizes: ${sized.map((t) => `${t.size} ${money(Number(t.cost))}`).join(', ')}.`);
  if (model.type === 'language') notes.push('Plus a small charge for the prompt and reply tokens.');
  const basis = n > 1 ? `for ${n} images at ${range(low, high)} each` : 'for 1 image';
  return { low: low * n, high: high * n, basis, notes };
}

export type VideoQuery = {
  /** Seconds of output; undefined when the length follows an input video. */
  seconds?: number;
  audio?: boolean;
  /** Kling "std"/"pro", or HeyGen's "text_to_video"/"image_to_video"/"reference_to_video". */
  mode?: string;
};

export function estimateVideo(model: GatewayModel, { seconds, audio, mode }: VideoQuery): Estimate {
  const p = model.pricing ?? {};
  let tiers = tiersOf(p.video_duration_pricing).filter((t) => Number.isFinite(Number(t.cost_per_second)));
  if (tiers.length === 0) {
    return p.video_token_pricing
      ? { unknown: 'This model is priced by video tokens, which depend on resolution and length, so the cost is only known after the call.' }
      : { unknown: 'AI Gateway lists no price for this model.' };
  }
  // Voice control is a paid extra this server never turns on.
  const plain = tiers.filter((t) => !t.voice_control);
  if (plain.length) tiers = plain;
  tiers = narrow(tiers, { audio, mode });

  const rates = tiers.map((t) => Number(t.cost_per_second));
  const [low, high] = [Math.min(...rates), Math.max(...rates)];
  const notes: string[] = [];
  if (low !== high) {
    const varies = ['resolution', 'audio', 'mode'].filter((key) => new Set(tiers.map((t) => String(t[key]))).size > 1);
    notes.push(`The rate depends on ${varies.join(' and ') || 'options'}, which this request leaves to the model's defaults: ${tiers.map((t) => `${[t.resolution, t.mode, t.audio === true ? 'with audio' : t.audio === false ? 'silent' : undefined].filter(Boolean).join(' ') || 'default'} ${money(Number(t.cost_per_second))}/s`).join(', ')}.`);
  }
  if (seconds === undefined) {
    return { low, high, basis: 'per second of output. The length follows the input video, so multiply by its length in seconds', notes };
  }
  return { low: low * seconds, high: high * seconds, basis: `for ${seconds} s at ${range(low, high)} per second`, notes };
}

/**
 * The tool reply for an estimate. List prices can trail what the provider
 * bills: bfl/flux-3-image was listed at $0.024 for 1024x1024 but billed $0.048
 * (Oct 2026), so the reply says the charge can be higher.
 */
export function estimateResult(model: string, estimate: Estimate, requestNotes: string[] = []): CallToolResult {
  if ('unknown' in estimate) {
    return textResult([`No price estimate for "${model}": ${estimate.unknown} Nothing was generated or charged.`, ...requestNotes].join('\n'));
  }
  return textResult(
    [
      `Price estimate for "${model}" (nothing was generated or charged): ${range(estimate.low, estimate.high)} ${estimate.basis}.`,
      ...estimate.notes,
      ...requestNotes,
      "Based on AI Gateway's published list prices. The provider's actual charge can be higher than the list price (one model has been billed double); it shows in the result and in Vercel's AI Gateway usage. Call again without estimate_only to run it.",
    ].join('\n'),
  );
}
