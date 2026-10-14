import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { MIN_SECRET_LENGTH } from './env';

export type SecretStatus = 'ok' | 'missing' | 'too_short';

export function secretStatus(): SecretStatus {
  const secret = process.env.MCP_SECRET;
  if (!secret) return 'missing';
  if (secret.length < MIN_SECRET_LENGTH) return 'too_short';
  return 'ok';
}

const sha256 = (value: string) => createHash('sha256').update(value).digest();

/**
 * Constant-time check of a candidate against MCP_SECRET. Hashing both sides
 * first gives equal-length buffers, so the comparison leaks neither content
 * nor length. Always false while the secret is missing or too short.
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
