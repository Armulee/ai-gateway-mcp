import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { isDemo } from './demo';
import { MIN_SECRET_LENGTH } from './env';

// The connector link carries a secret. The deployment can hold it two ways:
// MCP_SECRET_SHA256, a fingerprint (SHA-256, hex) of the secret, which is what
// the setup page and its agent prompt set, so neither Vercel nor a chat
// transcript ever holds the secret itself; or MCP_SECRET, the secret in plain
// text (local development, older copies). The fingerprint wins when both are
// set.
//
// With a fingerprint, only a random secret is accepted: 64 hex characters, as
// the setup page makes them (256 bits). A fingerprint is not secret, and
// SHA-256 is fast, so someone who sees it could try guesses offline; against
// a random secret that is hopeless, against a typed phrase it might not be.

export type SecretStatus = 'ok' | 'missing' | 'too_short' | 'weak' | 'bad_fingerprint';

const FINGERPRINT = /^[0-9a-f]{64}$/;
/** The shape of a secret the setup page makes: 32 random bytes as hex. */
const RANDOM_SECRET = /^[0-9a-f]{64}$/i;

/** MCP_SECRET_SHA256, trimmed and lower-cased; empty when unset. */
function fingerprint(): string {
  return (process.env.MCP_SECRET_SHA256 ?? '').trim().toLowerCase();
}

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

/** Strength rules for a secret in plain text. With a fingerprint they apply to each secret presented instead. */
function plainStatus(secret: string | undefined): SecretStatus {
  if (!secret) return 'missing';
  if (secret.length < MIN_SECRET_LENGTH) return 'too_short';
  if (looksGuessable(secret)) return 'weak';
  return 'ok';
}

export function secretStatus(): SecretStatus {
  const print = fingerprint();
  if (print) return FINGERPRINT.test(print) ? 'ok' : 'bad_fingerprint';
  return plainStatus(process.env.MCP_SECRET);
}

const sha256 = (value: string) => createHash('sha256').update(value).digest();

/**
 * Constant-time check of a candidate against the deployment's secret. Both
 * sides are compared as SHA-256 digests: equal-length buffers, so the check
 * leaks neither content nor length. Always false while the secret is
 * missing or unusable; with a fingerprint, only a random (64 hex) secret can
 * match, so a fingerprint of a guessable one is dead on arrival.
 */
export function matchesSecret(candidate: string): boolean {
  // The public demo never opens the connector or its usage, whatever is set.
  if (isDemo()) return false;
  if (secretStatus() !== 'ok') return false;
  const print = fingerprint();
  if (print) return RANDOM_SECRET.test(candidate) && timingSafeEqual(sha256(candidate), Buffer.from(print, 'hex'));
  return timingSafeEqual(sha256(candidate), sha256(process.env.MCP_SECRET!));
}

/**
 * Derives a purpose-specific key, e.g. for signing job ids, from the
 * fingerprint or MCP_SECRET. Changing the secret changes every derived key.
 * A fingerprint is not secret, but a job id is only ever accepted from a
 * caller who already presented the secret itself.
 */
export function deriveKey(label: string): Buffer {
  return createHmac('sha256', fingerprint() || process.env.MCP_SECRET!).update(label).digest();
}
