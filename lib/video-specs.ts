import type { GatewayModel } from './models';

// What each video model family accepts for resolution and length, from
// Vercel's AI Gateway video docs (text-to-video, image-to-video and
// reference-to-video pages, Oct 2026). The {width}x{height} values come from
// the AI SDK provider packages, which map them to the provider's tiers and
// pass anything else through unchanged: BytePlus rejected the docs' 854x480
// for Seedance (Oct 16 2026), its map has 864x480; Alibaba's has 832x480.
// A model missing here may still take a resolution, but nothing documents
// how, so start_video refuses to pass one.

export type Resolution = '480p' | '720p' | '1080p' | '4k';
export const RESOLUTIONS: Resolution[] = ['480p', '720p', '1080p', '4k'];

/** Allowed lengths: a range, or a fixed list (Veo 4/6/8, Kling v2 5/10). */
export type Seconds = { min: number; max: number } | number[];

type Spec = {
  /** Resolution name → the `{width}x{height}` the AI SDK sends. */
  sizes?: Partial<Record<Resolution, `${number}x${number}`>>;
  /** What the provider uses when no resolution is sent, where documented. */
  defaultResolution?: Resolution;
  seconds?: Seconds;
};

const P480 = '854x480';
const P720 = '1280x720';
const P1080 = '1920x1080';
const SEEDANCE = { '480p': '864x480', '720p': P720, '1080p': P1080 } as const;
const WAN = { '480p': '832x480', '720p': P720, '1080p': P1080 } as const;

// First match wins, so narrower patterns come first.
const SPECS: [RegExp, Spec][] = [
  [/^bytedance\/seedance-2\.5/, { sizes: SEEDANCE, seconds: { min: 4, max: 30 } }],
  [/^bytedance\/seedance-v1\.5/, { sizes: SEEDANCE, seconds: { min: 4, max: 12 } }],
  [/^bytedance\/seedance-v1\.0/, { sizes: SEEDANCE, seconds: { min: 2, max: 12 } }],
  [/^bytedance\/seedance-2\.0/, { sizes: SEEDANCE }],
  [/^spacexai\/grok-imagine-video/, { sizes: { '480p': P480, '720p': P720, '1080p': P1080 }, defaultResolution: '480p', seconds: { min: 1, max: 15 } }],
  [/^google\/veo-/, { sizes: { '720p': P720, '1080p': P1080, '4k': '3840x2160' }, defaultResolution: '720p', seconds: [4, 6, 8] }],
  [/^alibaba\/wan-v2\.5/, { sizes: WAN, seconds: [5, 10] }],
  [/^alibaba\/wan-v2\.6-r2v/, { sizes: { '720p': P720, '1080p': P1080 }, seconds: { min: 2, max: 10 } }],
  [/^alibaba\/wan-v2\.6-t2v/, { sizes: { '720p': P720, '1080p': P1080 }, seconds: { min: 2, max: 15 } }],
  [/^alibaba\/wan-v2\.[67]/, { sizes: { '720p': P720, '1080p': P1080 } }],
  [/^alibaba\/wan-v3/, { sizes: WAN }],
  [/^klingai\/kling-v3/, { seconds: { min: 3, max: 15 } }],
  [/^klingai\/kling-v2/, { seconds: [5, 10] }],
];

const specOf = (id: string): Spec => SPECS.find(([pattern]) => pattern.test(id))?.[1] ?? {};

const priceTiers = (model: GatewayModel) =>
  (model.pricing?.video_duration_pricing ?? []).filter((t) => Number.isFinite(Number(t.cost_per_second)));

/**
 * The resolutions start_video can ask this model for. When the catalog prices
 * the model by resolution, only those it lists count (Veo 3.0 has no 4k tier,
 * the first Grok Imagine Video no 1080p one).
 */
export function resolutionsOf(model: GatewayModel): Resolution[] {
  const sizes = specOf(model.id).sizes ?? {};
  const listed = new Set(priceTiers(model).map((t) => t.resolution?.toLowerCase()).filter(Boolean));
  return RESOLUTIONS.filter((r) => sizes[r] && (listed.size === 0 || listed.has(r)));
}

export const sizeOf = (model: GatewayModel, resolution: Resolution) => specOf(model.id).sizes?.[resolution];
export const defaultResolutionOf = (model: GatewayModel) => specOf(model.id).defaultResolution;
export const secondsOf = (model: GatewayModel): Seconds | undefined => specOf(model.id).seconds;

export function minSeconds(seconds: Seconds): number {
  return Array.isArray(seconds) ? Math.min(...seconds) : seconds.min;
}

export function describeSeconds(seconds: Seconds): string {
  return Array.isArray(seconds) ? `${seconds.join(', ')} s` : `${seconds.min}–${seconds.max} s`;
}

export function secondsAllowed(seconds: Seconds, value: number): boolean {
  return Array.isArray(seconds) ? seconds.includes(value) : value >= seconds.min && value <= seconds.max;
}

/** The allowed length closest to `wanted` that is not above `cap` (falls back to the shortest). */
export function fitSeconds(seconds: Seconds, wanted: number, cap: number): number {
  const options = Array.isArray(seconds) ? seconds : [Math.max(seconds.min, Math.min(seconds.max, wanted))];
  const fitting = options.filter((s) => s <= cap);
  if (fitting.length === 0) return minSeconds(seconds);
  return fitting.reduce((best, s) => (Math.abs(s - wanted) < Math.abs(best - wanted) ? s : best));
}

/** Per-second list price at a resolution (lowest when tiers also split by audio or mode). */
export function rateAt(model: GatewayModel, resolution: Resolution, audio?: boolean): number | undefined {
  let tiers = priceTiers(model).filter((t) => t.resolution?.toLowerCase() === resolution && !(t as { voice_control?: unknown }).voice_control);
  if (audio !== undefined && tiers.some((t) => t.audio === audio)) tiers = tiers.filter((t) => t.audio === undefined || t.audio === audio);
  const rates = tiers.map((t) => Number(t.cost_per_second));
  return rates.length ? Math.min(...rates) : undefined;
}

/** Short line for list_models: "480p, 720p, 1080p; 2–12 s", or what is not selectable. */
export function videoOptionsLine(model: GatewayModel): string {
  const resolutions = resolutionsOf(model);
  const seconds = secondsOf(model);
  return [
    resolutions.length ? `resolution ${resolutions.join('/')}` : 'resolution not selectable',
    seconds ? describeSeconds(seconds) : 'length range not documented',
  ].join('; ');
}
