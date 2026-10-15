import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { MIN_SECRET_LENGTH } from './env';

export type SecretStatus = 'ok' | 'missing' | 'too_short' | 'weak';

/** A secret needs this many different characters. A random one of 32 hex characters always has more. */
export const MIN_DISTINCT_CHARACTERS = 8;

/**
 * Typed-by-hand secrets that are long enough but easy to guess: too few
 * different characters (`aaaa…`), or one short block repeated
 * (`passwordpassword…`, `0123…ef0123…ef`). Random secrets never match.
 */
export function looksGuessable(secret: string): boolean {
  if (new Set(secret).size < MIN_DISTINCT_CHARACTERS) return true;
  const n = secret.length;
  for (let block = 1; block <= n / 2; block++) {
    if (n % block === 0 && secret.slice(0, block).repeat(n / block) === secret) return true;
  }
  return false;
}

export function secretStatus(): SecretStatus {
  const secret = process.env.MCP_SECRET;
  if (!secret) return 'missing';
  if (secret.length < MIN_SECRET_LENGTH) return 'too_short';
  if (looksGuessable(secret)) return 'weak';
  return 'ok';
}

const sha256 = (value: string) => createHash('sha256').update(value).digest();

/**
 * Constant-time check of a candidate against MCP_SECRET. Hashing both sides
 * first gives equal-length buffers, so the comparison leaks neither content
 * nor length. Always false while the secret is missing, too short or weak.
 */
export function matchesSecret(candidate: string): boolean {
  if (secretStatus() !== 'ok') return false;
  return timingSafeEqual(sha256(candidate), sha256(process.env.MCP_SECRET!));
}

/**
 * Derives a purpose-specific key from MCP_SECRET, e.g. for signing job ids.
 * Rotating the secret rotates every derived key.
 */
export function deriveKey(label: string): Buffer {
  return createHmac('sha256', process.env.MCP_SECRET!).update(label).digest();
}
