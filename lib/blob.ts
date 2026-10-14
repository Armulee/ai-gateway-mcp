import { randomBytes } from 'node:crypto';
import { BlobNotFoundError, head, issueSignedToken, presignUrl, put } from '@vercel/blob';
import { getConfig } from './env';

// Media is stored in a *private* Blob store. Nothing is reachable without a
// presigned URL, and every presigned URL expires (SIGNED_URL_TTL_HOURS, max 7 days).

/** True when the deployment is connected to a Blob store (OIDC) or has a read-write token. */
export function blobConfigured(): boolean {
  return Boolean(process.env.BLOB_STORE_ID || process.env.BLOB_READ_WRITE_TOKEN);
}

export const BLOB_MISSING_MESSAGE =
  'No Vercel Blob store is connected to this deployment. In the Vercel dashboard open the project → Storage → Create/Connect a Blob store (private), then redeploy.';

export function randomPath(folder: string, extension: string): string {
  return `${folder}/${randomBytes(24).toString('base64url')}.${extension}`;
}

export function extensionFor(mediaType: string): string {
  const subtype = mediaType.split('/')[1]?.split(';')[0] ?? 'bin';
  return subtype === 'jpeg' ? 'jpg' : subtype === 'quicktime' ? 'mov' : subtype;
}

export async function exists(pathname: string): Promise<boolean> {
  try {
    await head(pathname);
    return true;
  } catch (error) {
    if (error instanceof BlobNotFoundError) return false;
    throw error;
  }
}

/** Stores bytes unmodified (watermarks and metadata are kept). Never overwrites. */
export async function saveMedia(pathname: string, body: Buffer, contentType: string): Promise<void> {
  try {
    await put(pathname, body, {
      access: 'private',
      contentType,
      multipart: body.byteLength > 50 * 1024 * 1024,
    });
  } catch (error) {
    // A concurrent call may have stored the same deterministic path first.
    if (await exists(pathname)) return;
    throw error;
  }
}

export async function signedUrl(pathname: string): Promise<{ url: string; expiresAt: string }> {
  const validUntil = Date.now() + getConfig().signedUrlTtlHours * 60 * 60 * 1000;
  const token = await issueSignedToken({ pathname, operations: ['get'], validUntil });
  const { presignedUrl } = await presignUrl(token, {
    operation: 'get',
    pathname,
    validUntil,
    access: 'private',
  });
  return { url: presignedUrl, expiresAt: new Date(validUntil).toISOString() };
}
