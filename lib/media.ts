import { blobConfigured, extensionFor, randomPath, saveMedia, signedUrl } from './blob';

// Input media for tools that take a picture or a recording. The server fetches
// the file itself and hands the bytes to the model, so a private link from this
// server's own Blob store works as input, and providers never need to reach it.

export type Media = { bytes: Uint8Array; mediaType: string };

// "file" is any input a language model may read: an image, video, audio or PDF.
const LIMITS = { image: 20 * 1024 * 1024, audio: 25 * 1024 * 1024, file: 20 * 1024 * 1024 } as const;
const FETCH_TIMEOUT_MS = 30_000;

/** What a language model calls this input (its catalog `modalities.input`), or undefined if it is none of them. */
export function inputKindOf(mediaType: string): 'image' | 'video' | 'audio' | 'pdf' | undefined {
  if (mediaType.startsWith('image/')) return 'image';
  if (mediaType.startsWith('video/')) return 'video';
  if (mediaType.startsWith('audio/')) return 'audio';
  if (mediaType === 'application/pdf') return 'pdf';
  return undefined;
}

// Some hosts serve everything as octet-stream; the extension then says what it is.
const BY_EXTENSION: Record<string, string> = {
  png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp', gif: 'image/gif',
  mp4: 'video/mp4', mov: 'video/quicktime', webm: 'video/webm',
  mp3: 'audio/mpeg', wav: 'audio/wav', m4a: 'audio/mp4', ogg: 'audio/ogg', flac: 'audio/flac',
  pdf: 'application/pdf',
};

function guessType(url: string, header: string): string {
  if (header && header !== 'application/octet-stream' && header !== 'binary/octet-stream') return header;
  const ext = /\.([a-z0-9]+)(?:[?#]|$)/i.exec(new URL(url).pathname)?.[1]?.toLowerCase();
  return (ext && BY_EXTENSION[ext]) || header;
}

/** Fetches an https file of the given kind, refusing anything else or anything too big. */
export async function fetchMedia(url: string, kind: keyof typeof LIMITS): Promise<Media> {
  if (!url.startsWith('https://')) throw new MediaError(`The ${kind} link must start with https://.`);
  const res = await fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS), redirect: 'follow' });
  if (!res.ok) throw new MediaError(`Could not download the ${kind} (HTTP ${res.status}). The link may have expired.`);

  const mediaType = guessType(url, (res.headers.get('content-type') ?? '').split(';')[0].trim());
  // Video files carry audio too, so speech-to-text accepts them.
  const accepted =
    kind === 'audio' ? /^(audio|video)\//.test(mediaType) : kind === 'file' ? inputKindOf(mediaType) !== undefined : mediaType.startsWith('image/');
  if (!accepted) throw new MediaError(`The link is not ${WHAT[kind]} (it is "${mediaType || 'unknown'}").`);

  const declared = Number(res.headers.get('content-length') ?? 0);
  if (declared > LIMITS[kind]) throw new MediaError(tooBig(kind));
  const bytes = new Uint8Array(await res.arrayBuffer());
  if (bytes.byteLength > LIMITS[kind]) throw new MediaError(tooBig(kind));
  return { bytes, mediaType };
}

const WHAT = { image: 'an image', audio: 'an audio or video file', file: 'an image, video, audio file or PDF' } as const;
const tooBig = (kind: keyof typeof LIMITS) => `The ${kind} is larger than ${LIMITS[kind] / 1024 / 1024} MB.`;

/** A problem with the input the caller gave, shown to them as is. */
export class MediaError extends Error {}

/**
 * Saves generated media to Blob and returns readable link lines, or a note
 * saying why there are none. Media is stored unmodified.
 */
export async function storeAndLink(folder: string, files: Media[], label: string): Promise<{ links: string[]; notes: string[] }> {
  if (!blobConfigured()) return { links: [], notes: [`No Blob store connected, so the ${label.toLowerCase()} is inline only.`] };
  try {
    const links: string[] = [];
    for (const [i, file] of files.entries()) {
      const pathname = randomPath(folder, extensionFor(file.mediaType));
      await saveMedia(pathname, Buffer.from(file.bytes), file.mediaType);
      const { url, expiresAt } = await signedUrl(pathname);
      links.push(`${files.length > 1 ? `${label} ${i + 1}` : label}: ${url} (expires ${expiresAt})`);
    }
    return { links, notes: [] };
  } catch {
    return { links: [], notes: [`Saving to Blob failed, so the ${label.toLowerCase()} is inline only.`] };
  }
}

export function readCost(providerMetadata: unknown): unknown {
  return (providerMetadata as { gateway?: { cost?: unknown } } | undefined)?.gateway?.cost;
}
