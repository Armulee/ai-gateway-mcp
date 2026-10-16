// Reads the public AI Gateway model catalog. No auth needed.

const MODELS_URL = 'https://ai-gateway.vercel.sh/v1/models';
const CACHE_MS = 5 * 60 * 1000;

type PriceTier = {
  size?: string;
  quality?: string;
  style?: string;
  operation?: string;
  resolution?: string;
  mode?: string;
  audio?: boolean;
  cost?: string;
  cost_per_second?: string;
};

export type GatewayModel = {
  id: string;
  name?: string;
  type?: string;
  tags?: string[] | null;
  modalities?: { input?: string[]; output?: string[] };
  pricing?: {
    input?: string;
    output?: string;
    image?: string;
    image_dimension_quality_pricing?: PriceTier[];
    video_duration_pricing?: PriceTier[];
    video_token_pricing?: { tiers?: Record<string, { cost_per_million_tokens?: string } | string | undefined>[] };
  } & Record<string, unknown>;
};

export type ModelKind = 'text' | 'image' | 'video' | 'speech' | 'transcription';

let cache: { at: number; models: GatewayModel[] } | undefined;

export async function fetchModels(): Promise<GatewayModel[]> {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.models;
  const res = await fetch(MODELS_URL, { headers: { accept: 'application/json' } });
  if (!res.ok) throw new Error(`AI Gateway model list returned HTTP ${res.status}`);
  const body = (await res.json()) as { data?: GatewayModel[] };
  cache = { at: Date.now(), models: body.data ?? [] };
  return cache.models;
}

export async function findModel(id: string): Promise<GatewayModel | undefined> {
  return (await fetchModels()).find((m) => m.id === id);
}

/** Language models that can output images (e.g. Nano Banana) count as image models too. */
export function kindsOf(model: GatewayModel): ModelKind[] {
  const kinds: ModelKind[] = [];
  if (model.type === 'language') kinds.push('text');
  if (model.type === 'image' || model.modalities?.output?.includes('image')) kinds.push('image');
  if (model.type === 'video') kinds.push('video');
  if (model.type === 'speech') kinds.push('speech');
  // Live-only transcription models need a WebSocket session, which a tool call cannot hold.
  const live = (model.tags ?? []).includes('websocket-realtime') || /-(live|streaming)$/.test(model.id);
  if (model.type === 'transcription' && !live) kinds.push('transcription');
  return kinds;
}

/**
 * Capability tags. Video modes are mostly encoded in the id (kling-v3.0-i2v),
 * so read them from there and fall back to the declared input modalities.
 */
export function capabilitiesOf(model: GatewayModel): string[] {
  const caps = new Set<string>();
  if (model.type === 'video') {
    for (const tag of ['t2v', 'i2v', 'r2v', 'motion-control']) {
      if (new RegExp(`(^|[-/])${tag}($|-)`).test(model.id)) caps.add(tag);
    }
    if (caps.size === 0) {
      const input = model.modalities?.input ?? [];
      if (input.includes('text')) caps.add('t2v');
      if (input.includes('image')) caps.add('i2v');
    }
  }
  for (const tag of model.tags ?? []) caps.add(tag);
  return [...caps];
}

const perMillion = (perToken: string) => `$${+(Number(perToken) * 1e6).toFixed(4)}/M`;

/** Said instead of a price, so a chat never reads a missing price as free. */
export const PRICE_NOT_LISTED = 'price not listed by AI Gateway';

/** A tier's own name from whichever fields it has: "2048x2048 low", "vector_illustration", "web-grounding". */
const tierLabel = (t: PriceTier) => [t.size, t.quality, t.style, t.operation].filter(Boolean).join(' ');

/**
 * One short human-readable price line. FLUX.2, Prodia and FLUX 3 Video have
 * no price in the catalog at all ("0" input and output), so they read as not
 * listed rather than free.
 */
export function priceOf(model: GatewayModel): string {
  const p = model.pricing;
  if (!p) return PRICE_NOT_LISTED;
  const tokens = Number(p.input) > 0 || Number(p.output) > 0 ? `${perMillion(p.input ?? '0')} in, ${perMillion(p.output ?? '0')} out` : undefined;
  const video = p.video_duration_pricing;
  if (video?.length) {
    if (video.every((t) => t.resolution)) {
      // Tiers can also split by mode or audio; name those so equal resolutions are told apart.
      const label = (t: PriceTier) => [t.resolution, t.mode, t.audio === true ? 'with audio' : t.audio === false ? 'silent' : undefined].filter(Boolean).join(' ');
      return video.map((t) => `${label(t)} $${t.cost_per_second}/s`).join(', ');
    }
    // Tiers split by mode/audio instead of resolution: show the range.
    const costs = video.map((t) => Number(t.cost_per_second)).filter(Number.isFinite);
    const [min, max] = [Math.min(...costs), Math.max(...costs)];
    return min === max ? `$${min}/s` : `$${min}–$${max}/s depending on mode/audio`;
  }
  const videoTokens = (p.video_token_pricing?.tiers ?? [])
    .flatMap((tier) => Object.values(tier).map((v) => (typeof v === 'object' ? Number(v?.cost_per_million_tokens) : NaN)))
    .filter(Number.isFinite);
  if (videoTokens.length) {
    const [min, max] = [Math.min(...videoTokens), Math.max(...videoTokens)];
    return `${min === max ? `$${min}` : `$${min}–$${max}`} per million video tokens (depends on resolution and input)`;
  }
  const tiers = p.image_dimension_quality_pricing ?? [];
  if (p.image || tiers.length) {
    // Sized tiers are per image; tiers without a size (a style, a quality, an extra like web grounding) are named as they are.
    const sized = tiers.filter((t) => t.size).map((t) => `${tierLabel(t)} $${t.cost}`);
    const other = tiers.filter((t) => !t.size).map((t) => `${tierLabel(t) || 'other'} $${t.cost}`);
    return [
      p.image ? `$${p.image} per image` : undefined,
      sized.length ? `${sized.join(', ')}${p.image ? '' : ' per image'}` : undefined,
      tokens,
      other.length ? other.join(', ') : undefined,
    ]
      .filter(Boolean)
      .join('; ');
  }
  const perChar = Number(p.speech_input_character_cost);
  if (perChar > 0) return `$${+(perChar * 1000).toFixed(4)} per 1K characters`;
  const perSecond = Number(p.transcription_duration_cost_per_second);
  if (perSecond > 0) return `$${+(perSecond * 60).toFixed(4)} per minute of audio`;
  return tokens ?? PRICE_NOT_LISTED;
}
