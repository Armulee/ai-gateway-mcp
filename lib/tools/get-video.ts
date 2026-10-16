import { experimental_getVideoStatus as getVideoStatus } from 'ai';
import { z } from 'zod';
import { BLOB_MISSING_MESSAGE, blobConfigured, exists, extensionFor, saveMedia, signedUrl } from '../blob';
import { billedCost, errorResult, textResult, toolError, type ToolContext } from '../gateway';
import { decodeJobId, videoPath, type VideoJob } from '../jobs';
import type { MediaView } from '../ui/media-types';

type VideoData =
  | { type: 'url'; url: string; mediaType: string }
  | { type: 'base64'; data: string; mediaType: string }
  | { type: 'binary'; data: Uint8Array; mediaType: string };

async function readBytes(video: VideoData): Promise<Buffer> {
  if (video.type === 'base64') return Buffer.from(video.data, 'base64');
  if (video.type === 'binary') return Buffer.from(video.data);
  const res = await fetch(video.url);
  if (!res.ok) throw new Error(`Downloading the finished video failed with HTTP ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

/**
 * How long one get_video call waits for a pending job. Chat apps can't pause
 * between calls, so they ask again at once; waiting here keeps that to a few
 * calls per video instead of dozens.
 */
const WAIT_MS = 40_000;
const POLL_MS = 5_000;
export const GET_VIDEO_WAIT_S = WAIT_MS / 1000;

async function linksMessage(job: VideoJob, pathnames: string[], cost?: number) {
  const lines = [`Video ready (${job.model})${cost != null ? `, cost: $${cost}` : ''}.`];
  const view: MediaView = { source: 'result', model: job.model, cost, items: [] };
  for (const [i, pathname] of pathnames.entries()) {
    const { url, expiresAt } = await signedUrl(pathname);
    lines.push(`Video ${i + 1}: ${url} (link expires ${expiresAt}; call get_video again for a fresh link)`);
    view.items.push({ kind: 'video', url, expiresAt });
  }
  // structuredContent feeds the MCP Apps view (a player); the text stays for every other host.
  return { ...textResult(lines.join('\n')), structuredContent: view };
}

export const getVideoTool = {
  name: 'get_video',
  description:
    'Check a video job from start_video, motion_control, upscale_video, edit_video or extend_video. Returns "still generating" or, when done, what AI Gateway billed and private download links (they expire; calling again issues fresh links).',
  inputSchema: z.object({
    job_id: z.string().min(1).describe('The job_id returned by a video tool'),
  }),
  async run({ job_id }: { job_id: string }, ctx: ToolContext) {
    if (!blobConfigured()) return errorResult(BLOB_MISSING_MESSAGE);
    const job = decodeJobId(job_id, ctx.keyPrefix);
    if (!job) {
      return errorResult('This job_id is not valid for this server. It may be mistyped, or MCP_SECRET was rotated after the job started.');
    }

    // Stored by an earlier call: answered from Blob once the provider's copy is gone.
    const stored = videoPath(job, 0, 'mp4', ctx.keyPrefix);
    try {
      // Blob is only touched once the job is over, so waiting costs no Blob operations.
      const checkStatus = () => getVideoStatus(ctx.gateway.videoModel(job.model), { operation: { gatewayJobId: job.gatewayJobId } });
      const deadline = Date.now() + WAIT_MS;
      let status = await checkStatus();
      while (status.status === 'pending' && Date.now() + POLL_MS < deadline) {
        await new Promise((resolve) => setTimeout(resolve, POLL_MS));
        status = await checkStatus();
      }
      if (status.status === 'pending') {
        return textResult(
          `Still generating with ${job.model} (this call waited ${GET_VIDEO_WAIT_S} s). Call get_video again; each call waits up to ${GET_VIDEO_WAIT_S} s, so there is no need to pause first.`,
        );
      }
      if (status.status === 'error') {
        if (await exists(stored)) return linksMessage(job, [stored]);
        return errorResult(`Video generation with "${job.model}" failed: ${status.error}`);
      }

      const pathnames: string[] = [];
      for (const [i, video] of (status.videos as VideoData[]).entries()) {
        const mediaType = video.mediaType || 'video/mp4';
        const pathname = videoPath(job, i, extensionFor(mediaType), ctx.keyPrefix);
        if (!(await exists(pathname))) await saveMedia(pathname, await readBytes(video), mediaType);
        pathnames.push(pathname);
      }
      if (pathnames.length === 0) return errorResult(`"${job.model}" finished but returned no video.`);
      const cost = await billedCost(ctx, (status.providerMetadata?.gateway as { generationId?: unknown } | undefined)?.generationId);
      return linksMessage(job, pathnames, cost);
    } catch (error) {
      // The provider's job may be gone while the copy in Blob is still there.
      if (await exists(stored).catch(() => false)) return linksMessage(job, [stored]);
      return toolError(error, job.model, 'video');
    }
  },
};
