// Runtime configuration read from environment variables. Read on each call so
// tests and redeploys never see stale values.

export const MIN_SECRET_LENGTH = 32;
// Vercel Blob presigned URLs can live at most 7 days.
const MAX_SIGNED_URL_TTL_HOURS = 7 * 24;

function positiveInt(name: string, fallback: number): number {
  const parsed = Number.parseInt(process.env[name] ?? '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function getConfig() {
  return {
    maxVideoSeconds: positiveInt('MAX_VIDEO_SECONDS', 8),
    maxImagesPerCall: positiveInt('MAX_IMAGES_PER_CALL', 4),
    allowedModels: (process.env.ALLOWED_MODELS ?? '')
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean),
    signedUrlTtlHours: Math.min(
      positiveInt('SIGNED_URL_TTL_HOURS', 24),
      MAX_SIGNED_URL_TTL_HOURS,
    ),
  } as const;
}

export function isModelAllowed(modelId: string): boolean {
  const { allowedModels } = getConfig();
  return allowedModels.length === 0 || allowedModels.includes(modelId);
}
