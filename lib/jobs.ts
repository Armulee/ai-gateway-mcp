import { createHmac, timingSafeEqual } from 'node:crypto';
import { deriveKey } from './secret';

// Video jobs are stateless: the job_id handed to the MCP client carries the
// model and the AI Gateway job id, signed with a key derived from MCP_SECRET
// so it cannot be forged or edited. Rotating the secret invalidates old ids.
// startedAt (Unix seconds) lets get_video tell how long a job has run; ids
// made before it was added have none.

export type VideoJob = { model: string; gatewayJobId: string; startedAt?: number };

const mac = (keyPrefix: string, label: string, value: string) =>
  createHmac('sha256', deriveKey(`${keyPrefix}:${label}`)).update(value).digest();

export function encodeJobId(job: VideoJob, keyPrefix: string): string {
  const payload = Buffer.from(JSON.stringify({ m: job.model, j: job.gatewayJobId, t: job.startedAt })).toString('base64url');
  const signature = mac(keyPrefix, 'video-job', payload).subarray(0, 16).toString('base64url');
  return `${payload}.${signature}`;
}

/** Returns undefined for malformed, edited or foreign job ids. */
export function decodeJobId(jobId: string, keyPrefix: string): VideoJob | undefined {
  const [payload, signature, extra] = jobId.split('.');
  if (!payload || !signature || extra !== undefined) return undefined;
  const expected = mac(keyPrefix, 'video-job', payload).subarray(0, 16);
  const given = Buffer.from(signature, 'base64url');
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return undefined;
  try {
    const { m, j, t } = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (typeof m !== 'string' || typeof j !== 'string') return undefined;
    return { model: m, gatewayJobId: j, ...(typeof t === 'number' ? { startedAt: t } : {}) };
  } catch {
    return undefined;
  }
}

/** Deterministic but unguessable Blob path, so repeated get_video calls reuse one upload. */
export function videoPath(job: VideoJob, index: number, extension: string, keyPrefix: string): string {
  const name = mac(keyPrefix, 'video-path', job.gatewayJobId).toString('base64url');
  return `videos/${name}-${index}.${extension}`;
}
