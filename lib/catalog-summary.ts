import { fetchModels, kindsOf, type GatewayModel } from './models';

export type KindCounts = { text: number; image: number; video: number };

export type CatalogSummary = {
  counts: KindCounts;
  total: number;
  /** Number of distinct providers (the part of the id before the slash). */
  providers: number;
  /** Those provider ids, e.g. "openai", "anthropic". */
  providerIds: string[];
  /** A spread of real model ids across providers, for the marquee. */
  sampleIds: string[];
  /** Providers with models of each kind, the ones with the most models first. */
  kindProviders: Record<keyof KindCounts, string[]>;
};

/** Each model counts once: video before image before text. */
function primaryKind(model: GatewayModel): keyof KindCounts | undefined {
  const kinds = kindsOf(model);
  if (kinds.includes('video')) return 'video';
  if (kinds.includes('image')) return 'image';
  if (kinds.includes('text')) return 'text';
  return undefined;
}

/** Live numbers for the website. Returns null when the catalog cannot be read, so no number is ever made up. */
export async function getCatalogSummary(): Promise<CatalogSummary | null> {
  try {
    const models = (await fetchModels()).filter((m) => primaryKind(m));
    if (models.length === 0) return null;
    const counts: KindCounts = { text: 0, image: 0, video: 0 };
    for (const model of models) counts[primaryKind(model)!]++;
    const step = Math.max(1, Math.floor(models.length / 48));
    const sampleIds = models.filter((_, i) => i % step === 0).map((m) => m.id);
    const providerIds = [...new Set(models.map((m) => m.id.split('/')[0]))];
    const perKind = { text: new Map(), image: new Map(), video: new Map() } as Record<keyof KindCounts, Map<string, number>>;
    for (const model of models) {
      const tally = perKind[primaryKind(model)!];
      const provider = model.id.split('/')[0];
      tally.set(provider, (tally.get(provider) ?? 0) + 1);
    }
    const ranked = (tally: Map<string, number>) => [...tally].sort((a, b) => b[1] - a[1]).map(([id]) => id);
    const kindProviders = { text: ranked(perKind.text), image: ranked(perKind.image), video: ranked(perKind.video) };
    return { counts, total: models.length, providers: providerIds.length, providerIds, sampleIds, kindProviders };
  } catch {
    return null;
  }
}

/** Shape of the particle field when the catalog is unavailable. Decorative only, never displayed as numbers. */
export const FALLBACK_COUNTS: KindCounts = { text: 300, image: 40, video: 40 };
