/** Static asset imports are a URL string with Turbopack and `{ src }` with webpack. Accept both. */
export function assetUrl(asset: unknown): string {
  return typeof asset === 'string' ? asset : (asset as { src: string }).src;
}
